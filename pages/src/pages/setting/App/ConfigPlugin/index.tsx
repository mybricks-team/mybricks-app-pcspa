import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  Popconfirm,
  Descriptions,
  message,
  Typography,
  Divider,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { _NAMESPACE_ } from "..";
import { EnumPluginType, PluginType } from "./type";
import { TConfigProps } from "../useConfig";
import EditForm, { pluginTypeMap } from "./Form";

export default ({ config, mergeUpdateConfig, user }: TConfigProps) => {
  const plugins: PluginType[] = config?.plugins || [];
  const [pluginsList, setPluginsList] = useState<PluginType[]>([]);

  useEffect(() => {
    const newPluginsList = (plugins || []).map((item) => ({
      ...item,
      isEdit: false,
      isAppend: false,
    }));
    setPluginsList(newPluginsList);
  }, [config]);

  const createConfig = useCallback(
    (newPluginsList: PluginType[]) => {
      const newConfig = { ...config, plugins: newPluginsList };
      return newConfig;
    },
    [config]
  );

  const onOk = useCallback(
    (plugins: PluginType, isAppend: boolean, index: number) => {
      if (!plugins?.name || !plugins?.title || !plugins?.url) {
        message.info("请填写好必填项");
        return;
      }
      const updateTime = dayjs(Date.now()).format("YYYY-MM-DD HH:mm:ss");
      const newPluginsList = [...pluginsList];
      const currentPlugin = {
        ...plugins,
        user: {
          email: user?.email,
        },
        updateTime,
        isEdit: false
      };
      if (!isAppend) {
        newPluginsList[index] = currentPlugin;
      } else {
        if (pluginsList.find((plugin) => plugin.name === plugins.name)) {
          message.info("添加失败：已存在name标识相同的插件！");
          return;
        }
        newPluginsList[newPluginsList.length - 1] = currentPlugin;
      }
      mergeUpdateConfig(createConfig(newPluginsList));
      setPluginsList(newPluginsList);
    },
    [pluginsList]
  );

  const onCancel = useCallback(
    (index: number, isAppend: boolean) => {
      const newPluginsList = [...pluginsList];
      if (isAppend) {
        newPluginsList.splice(index, 1);
      } else {
        newPluginsList[index].isEdit = false;
      }
      setPluginsList(newPluginsList);
    },
    [pluginsList]
  );

  const onAdd = useCallback(() => {
    if (pluginsList.some((item) => item?.isEdit === true)) {
      message.info("请先保存正在编辑中的插件");
      return;
    }
    setPluginsList([
      ...pluginsList,
      {
        name: "",
        title: "",
        url: "",
        type: EnumPluginType.NORMAL,
        user: {
          email: user?.email,
        },
        isEdit: true,
        isAppend: true,
      },
    ]);
  }, [pluginsList]);

  const onEdit = useCallback(
    (index: number) => {
      const newPluginsList = [...pluginsList];
      newPluginsList[index].isEdit = true;
      setPluginsList(newPluginsList);
    },
    [pluginsList]
  );

  const onDelete = useCallback(
    (index: number) => {
      const newPluginsList = [...pluginsList];
      newPluginsList.splice(index, 1);
      const newConfig = { ...config };
      newConfig.plugins = newPluginsList;
      mergeUpdateConfig(createConfig(newPluginsList));
      setPluginsList(newPluginsList);
    },
    [pluginsList]
  );

  return (
    <>
      {pluginsList.map((plugin, index) => {
        const {
          title,
          name,
          url,
          runtimeUrl,
          description,
          updateTime,
          user,
          isEdit = false,
          isAppend = false,
          type = EnumPluginType,
        } = plugin;
        let tempValue: PluginType = plugin;
        const updatePlugin = (newValue: PluginType) => {
          tempValue = newValue;
        };
        return (
          <>
            <Descriptions
              title={title}
              column={1}
              labelStyle={{
                fontWeight: "500",
              }}
              extra={
                <>
                  {isEdit ? (
                    <>
                      <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => onCancel(index, isAppend)}
                      >
                        取消
                      </Button>
                      <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => onOk(tempValue, isAppend, index)}
                      >
                        确认
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="link"
                      icon={<EditOutlined />}
                      onClick={() => {
                        onEdit(index);
                      }}
                    >
                      编辑
                    </Button>
                  )}
                  <Popconfirm
                    title={`确定删除插件 ${plugin.title} 吗？`}
                    onConfirm={() => {
                      onDelete(index);
                    }}
                    okText="确定"
                    cancelText="再想想"
                  >
                    <Button type="link" icon={<DeleteOutlined />}>
                      删除
                    </Button>
                  </Popconfirm>
                </>
              }
            >
              {!isEdit && (
                <>
                  <Descriptions.Item label="唯一标识">{name}</Descriptions.Item>
                  <Descriptions.Item label="插件类型">
                    {pluginTypeMap[String(type)]}
                  </Descriptions.Item>
                  <Descriptions.Item label="资源地址">{url}</Descriptions.Item>
                  <Descriptions.Item label="runtime地址">
                    {runtimeUrl}
                  </Descriptions.Item>
                  <Descriptions.Item label="更新信息">
                    {description}
                  </Descriptions.Item>
                </>
              )}
            </Descriptions>
            {isEdit && (
              <EditForm
                isAppend={isAppend}
                plugin={plugin}
                updatePlugin={updatePlugin}
              />
            )}
            <Typography.Paragraph
              type="secondary"
              style={{ textAlign: "right" }}
            >
              {user?.email} 更新于 {updateTime}
            </Typography.Paragraph>
            <Divider />
          </>
        );
      })}
      <Button type="dashed" onClick={onAdd} block icon={<PlusOutlined />}>
        添加插件
      </Button>
    </>
  );
};
