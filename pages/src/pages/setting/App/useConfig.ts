import React, { useCallback, useEffect, useState } from "react";
import API from "@mybricks/sdk-for-app/api";
import { debounce } from "lodash";
import { message } from "antd";

export type TConfigProps<T = any> = {
  config: T;
  mergeUpdateConfig: (values: Partial<T>, deleteKey?: string) => void;
  updateConfig: (values?: T) => Promise<void>;
  loading: boolean;
  user: {
    email: string;
  };
  options: any;
};

export default <T = any>(
  namespace,
  defaultValue = {} as T,
  options = {}
): TConfigProps<T> => {
  const [config, setConfig] = useState<T>(defaultValue);
  const [tempConfig, setTempConfig] = useState<T>(defaultValue);
  // 缓存避免使用值更新收集数据输入框抖动
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    API.User.getLoginUser().then((user) => {
      setUser(user);
    });
    setLoading(true);
    API.Setting.getSetting([namespace], options)
      .then((res) => {
        try {
          const newConfig =
            typeof res[namespace]?.config === "string"
              ? JSON.parse(res[namespace]?.config)
              : res[namespace]?.config || {};
          setConfig(newConfig);
          setTempConfig(newConfig);
        } catch (error) {
          setConfig({} as T);
          setTempConfig({} as T);
          return;
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const ifRequired = (data: Record<string, any>) => {
    // 判断 Env和Plugins是否字段都填写了
    const checkTitlesAndNames = (items: Array<any>) => {
      return items.every(
        (item: Record<string, any>) => item.title && item.name
      );
    };

    const isPluginsValid = checkTitlesAndNames(data?.plugins || []);
    const isEnvListValid = checkTitlesAndNames(
      data?.publishEnvConfig?.envList || []
    );

    return isPluginsValid && isEnvListValid;
  };

  const ifUnique = (data: Record<string, any>) => {
    // 判断 plugins 和 envList 是否有title和name一致的
    const { plugins = [], publishEnvConfig = {} } = data;
    const { envList = [] } = publishEnvConfig;
    function areTitlesAndNamesUnique(lists: Array<any>) {
      let titlesSet = new Set();
      let namesSet = new Set();

      for (const list of lists) {
        for (const item of list) {
          if (titlesSet.has(item.title) || namesSet.has(item.name)) {
            return false;
          }
          titlesSet.add(item.title);
          namesSet.add(item.name);
        }
        // 清空集合以便下一组数据的比较
        titlesSet.clear();
        namesSet.clear();
      }

      return true;
    }
    return areTitlesAndNamesUnique([plugins, envList]);
  };

  // 完整更新更新 // 点击保存更新为configTemp缓存的 传值的合并下更新
  const updateConfig = useCallback(
    async (values?: any) => {
      const newConfig = { ...tempConfig, ...(values || {}) };
      if (!ifRequired(newConfig)) {
        message.info("请填写好必填项");
        return;
      }
      if (!ifUnique(newConfig)) {
        message.info("请检查环境变量、插件的名称和标识");
        return;
      }
      setLoading(true);
      try {
        await API.Setting.saveSetting(namespace, newConfig, user?.id, options);
        setTempConfig(newConfig);
        setConfig(newConfig);
        message.success("保存成功");
      } finally {
        setLoading(false);
      }
    },
    [user, config, tempConfig]
  );

  // 合并更新，参数只提供要修改的部分即可 // 直接监听每个form的值更新 debounce
  const mergeUpdateConfig = useCallback(
    debounce((values: Partial<T>, deleteKey?: string) => {
      const newConfig = { ...tempConfig, ...values };
      if (deleteKey && !values.hasOwnProperty(deleteKey)) {
        delete newConfig[deleteKey];
      }
      setTempConfig(newConfig);
    }),
    [config, updateConfig, tempConfig]
  );

  return {
    config,
    updateConfig,
    loading,
    user,
    options,
    mergeUpdateConfig,
  };
};
