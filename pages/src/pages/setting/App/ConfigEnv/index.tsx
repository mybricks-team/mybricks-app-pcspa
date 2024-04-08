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
  isEdit?: boolean; // 是否编辑中
  isAppend?: boolean; // 是否新增
};

export type TPublishConfig = {
  envList: Array<TPublishEnv>;
};

export default ({ config, mergeUpdateConfig, user }: TConfigProps) => {
  const publishEnvConfig: TPublishConfig = config?.publishEnvConfig || {};
  const [envList, setEnvList] = useState<TPublishEnv[]>([]);

  useEffect(() => {
    const nextEnvList = (publishEnvConfig?.envList || []).map(
      (item) => ({
        ...item,
        isEdit: false,
        isAppend: false,
      })
    );
    setEnvList(nextEnvList);
  }, [config]);

  const onClickAdd = useCallback(() => {
    if (envList.some((item) => item?.isEdit === true)) {
      message.info("请先保存正在编辑中的环境");
      return;
    }
    setEnvList([
      ...envList,
      {
        name: "",
        title: "",
        defaultApiPrePath: "",
        updateTime: "",
        user: {
          email: user.email,
        },
        isEdit: true,
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

  const onOk = useCallback(
    (publishEnv: TPublishEnv, isAppend: boolean, index: number) => {
      if (!publishEnv?.name || !publishEnv?.title) {
        message.info("请填写好必填项");
        return;
      }
      const updateTime = dayjs(Date.now()).format("YYYY-MM-DD HH:mm:ss");
      const currentPublishEnv = {
        ...publishEnv,
        user: { email: user.email },
        updateTime,
        isEdit: false,
      };
      const newEnvList = [...envList];
      if (!isAppend) {
        newEnvList.splice(index, 1, currentPublishEnv);
      } else {
        if (
          envList.find(
            ({ name, title }) =>
              name === publishEnv.name || title === publishEnv.title
          )
        ) {
          message.info("该环境已存在");
          return;
        }
        currentPublishEnv.isAppend = false;
        newEnvList[newEnvList.length - 1] = currentPublishEnv; // 修改最后一个（新增的）
      }

      mergeUpdateConfig(createConfig(newEnvList));
      setEnvList(newEnvList);
    },
    [envList, user]
  );

  const onCancel = useCallback(
    (index: number, isAppend: boolean) => {
      const newEnvList = [...envList];
      if (isAppend) {
        newEnvList.splice(index, 1);
      } else {
        newEnvList[index].isEdit = false;
      }
      setEnvList(newEnvList);
    },
    [envList]
  );

  const onEdit = useCallback(
    (index: number) => {
      const newEnvList = [...envList];
      newEnvList[index].isEdit = true;
      setEnvList(newEnvList);
    },
    [envList]
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

  return (
    <>
      {envList.map((item, index) => {
        const {
          title = "",
          name = "",
          defaultApiPrePath = "",
          updateTime,
          user,
          isEdit = false,
          isAppend = false,
        } = item;
        let tempValue: TPublishEnv = item;
        const updateEnv = (newValue: TPublishEnv) => {
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
                      onClick={() => onEdit(index)}
                    >
                      编辑
                    </Button>
                  )}
                  <Popconfirm
                    title={`确定删除环境 ${item.title} 吗？`}
                    onConfirm={() => onDelete(index)}
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
                  <Descriptions.Item label="环境名称">
                    {title}
                  </Descriptions.Item>
                  <Descriptions.Item label="环境标识">{name}</Descriptions.Item>
                  <Descriptions.Item label="接口默认前缀">
                    {defaultApiPrePath}
                  </Descriptions.Item>
                </>
              )}
            </Descriptions>
            {isEdit && (
              <EditForm
                isAppend={isAppend}
                publishEnv={item}
                updateEnv={updateEnv}
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
      <Button onClick={onClickAdd} type="dashed" block icon={<PlusOutlined />}>
        添加
      </Button>
    </>
  );
};
