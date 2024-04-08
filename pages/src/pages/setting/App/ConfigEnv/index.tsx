import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  message,
  Button,
  Descriptions,
  Popconfirm,
  Typography,
  Divider,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { _NAMESPACE_ } from "..";
import dayjs from "dayjs";
import { TConfigProps } from "../useConfig";
import EditForm from "./Form";

export type TPublishEnv = {
  name: string;
  title: string;
  // 该环境下的接口前缀
  defaultApiPrePath: string;
  updateTime: string;
  user: any;
  isAppend?: boolean;
};

export type TPublishConfig = {
  envList: Array<TPublishEnv>;
};

export default ({ config, mergeUpdateConfig, user }: TConfigProps) => {
  const publishEnvConfig: TPublishConfig = config?.publishEnvConfig || {};
  const [envList, setEnvList] = useState<TPublishEnv[]>([]);

  useEffect(() => {
    const nextEnvList = publishEnvConfig?.envList || [];
    setEnvList(nextEnvList.map((item) => ({ ...item, isAppend: false })));
  }, [config]);

  const onClickAdd = useCallback(() => {
    setEnvList([
      ...envList,
      {
        name: "",
        title: "",
        defaultApiPrePath: "",
        updateTime: "",
        user: {
          email: user?.email,
        },
        isAppend: true,
      },
    ]);
  }, [envList, user]);

  const createConfig = useCallback(
    (newEnvList: string | any[]) => {
      const newConfig = { ...config };
      // 因为平台会合并协作组与全局setting，所以协作组环境没有设置时，需要直接删除publishEnvConfig字段
      if (newEnvList.length === 0) {
        delete newConfig.publishEnvConfig;
      } else {
        newConfig.publishEnvConfig = { envList: newEnvList };
      }
      return newConfig;
    },
    [config]
  );

  const onDelete = useCallback(
    (index: number) => {
      const newEnvList = [...envList];
      newEnvList.splice(index, 1);
      mergeUpdateConfig(createConfig(newEnvList), "publishEnvConfig");
      setEnvList(newEnvList);
    },
    [envList]
  );

  const update = useCallback(
    (publishEnv: TPublishEnv, index: number) => {
      const updateTime = dayjs(Date.now()).format("YYYY-MM-DD HH:mm:ss");
      const currentPublishEnv = {
        ...publishEnv,
        user: { email: user?.email },
        updateTime,
      };
      const newEnvList = [...envList];
      newEnvList[index] = currentPublishEnv;
      mergeUpdateConfig(createConfig(newEnvList));
    },
    [envList]
  );

  return (
    <>
      {envList.map((item, index) => {
        const { title = "", updateTime, user, isAppend = false } = item;
        const updateEnv = (newValue: TPublishEnv) => {
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
                  onClick={() => onDelete(index)}
                >
                  删除
                </Button>
              }
            ></Descriptions>
            <EditForm
              publishEnv={item}
              isAppend={isAppend}
              updateEnv={updateEnv}
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
      <Button onClick={onClickAdd} type="dashed" block icon={<PlusOutlined />}>
        添加
      </Button>
    </>
  );
};
