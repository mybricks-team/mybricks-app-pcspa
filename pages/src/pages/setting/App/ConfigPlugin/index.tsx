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

  const onAdd = useCallback(() => {
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

  const onDelete = useCallback(
    (index: number) => {
      const newPluginsList = [...pluginsList];
      newPluginsList.splice(index, 1);
      mergeUpdateConfig(createConfig(newPluginsList));
      setPluginsList(newPluginsList);
    },
    [pluginsList]
  );

  const update = useCallback(
    (plugin: PluginType, index: number) => {
      const updateTime = dayjs(Date.now()).format("YYYY-MM-DD HH:mm:ss");
      const currentPublishEnv = {
        ...plugin,
        user: { email: user?.email },
        updateTime,
      };
      const newPluginsList = [...plugins];
      newPluginsList[index] = currentPublishEnv;
      mergeUpdateConfig(createConfig(newPluginsList));
    },
    [pluginsList]
  );

  return (
    <>
      {pluginsList.map((plugin, index) => {
        const { title, updateTime, user, isAppend = false } = plugin;
        const updatePlugin = (newValue: PluginType) => {
          update(newValue, index);
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
                <Button
                  type="link"
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    onDelete(index);
                  }}
                >
                  删除
                </Button>
              }
            ></Descriptions>
            <EditForm
              plugin={plugin}
              isAppend={isAppend}
              updatePlugin={updatePlugin}
            />
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
