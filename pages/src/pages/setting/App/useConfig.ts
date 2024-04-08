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
        } catch (error) {
          setConfig({} as T);
          return;
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // 完整更新更新 // 点击保存更新为configTemp缓存的 传值的合并下更新
  const updateConfig = useCallback(
    (values?) => {
      setLoading(true);
      const newConfig = { ...config, ...(values || {}) };
      return API.Setting.saveSetting(namespace, newConfig, user?.id, options)
        .then(() => {
          setConfig(newConfig);
          message.success("保存成功");
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [user, config]
  );

  // 合并更新，参数只提供要修改的部分即可 // 直接监听每个form的值更新 debounce
  const mergeUpdateConfig = useCallback(
    debounce((values: Partial<T>, deleteKey?: string) => {
      const newConfig = { ...config, ...values };
      if (deleteKey && !values.hasOwnProperty(deleteKey)) {
        delete newConfig[deleteKey];
      }
      setConfig(newConfig);
    }),
    [config, updateConfig]
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
