import React, { useCallback, useEffect, useRef, useState } from 'react'
import { message, Form, Input, Card, Button, Space, Descriptions, Modal } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { _NAMESPACE_ } from "../app";
import dayjs from "dayjs";
import styles from "./index.less";
import { TConfigProps } from '../useConfig';
import EditModal from './Modal';

const { Meta } = Card;

const UpdateInfo = ({ configItem }) => {
  return Object.keys(configItem).length > 0 && <Meta description={`${configItem?.user} 更新于 ${configItem?.updateTime}`} />
}

export type TPublishEnv = {
  name: string,
  title: string,
  // 该环境下的接口前缀
  defaultApiPrePath: string
  updateTime: string
  user: string
}

export type TPublishConfig = {
  envList: Array<TPublishEnv>,
  // 发布接口
  publishApi: string,
}

export default ({ config, mergeUpdateConfig, loading, user }: TConfigProps) => {
  const [visible, setVisible] = useState(false)
  const [status, setStatus] = useState<"edit" | "append">()
  const [publishEnv, setPublishEnv] = useState<TPublishEnv>()

  const publishConfig: TPublishConfig = config?.publishConfig || {}
  const { envList = [], publishApi = '' } = publishConfig

  const onClickAdd = () => {
    setStatus('append')
    setPublishEnv({
      name: '',
      title: '',
      defaultApiPrePath: '',
      updateTime: '',
      user: '',
    })
    setVisible(true)
  };

  const onOk = async (publishEnv) => {
    setVisible(false)
    const updateTime = dayjs(Date.now()).format("YYYY-MM-DD HH:mm:ss")
    const currentPublishEnv = { ...publishEnv, user, updateTime }
    const newEnvList = [...envList]
    if (status === "edit") {
      const index = envList.findIndex(
        ({ name }) => name === publishEnv.name
      );
      newEnvList.splice(index, 1, currentPublishEnv);
    } else if (status === "append") {
      if (envList.find(({ name, title }) => name === publishEnv.name || title === publishEnv.title)) {
        message.info("该环境已存在");
        return;
      }
      newEnvList.push(currentPublishEnv);
    }
    await mergeUpdateConfig({
      publishConfig: { envList: newEnvList, publishApi }
    }).then(() => {
      message.success(status === "edit" ? "更新成功" : "添加成功");
    })
  }

  const onCancel = () => {
    setVisible(false)
  }

  const onEdit = (publishEnv: TPublishEnv) => {
    setStatus('edit')
    setPublishEnv(publishEnv)
    setVisible(true)
  }

  const onDelete = async (publishEnv: TPublishEnv) => {
    Modal.confirm({
      title: `确认删除环境：【${publishEnv.title}】？`,
      onOk() {
        const newEnvList = [...envList]
        const index = envList.findIndex(
          ({ name }) => name === publishEnv.name
        );
        newEnvList.splice(index, 1);
        return mergeUpdateConfig({
          publishConfig: { envList: newEnvList, publishApi }
        }).then(() => {
          message.success("删除成功");
        })
      }
    })
  }


  return <Card title="发布环境" style={{ width: '50vw', marginTop: 24 }} loading={loading}>
    <Space>
      {envList.map(item => {
        const { title = '', name = '', defaultApiPrePath = '', updateTime, user } = item
        return <Card
          style={{ width: 320 }}
          actions={[
            <EditOutlined key="edit" onClick={() => onEdit(item)} />,
            <DeleteOutlined
              key="delete"
              onClick={() => onDelete(item)}
            />,
          ]}
        >
          <Descriptions title={title} layout="horizontal" column={1} labelStyle={{
            fontWeight: '500'
          }}>
            <Descriptions.Item label="name">{name}</Descriptions.Item>
            <Descriptions.Item label="接口前缀">{defaultApiPrePath}</Descriptions.Item>
          </Descriptions>
          <Meta
            description={`${user.email} 更新于 ${updateTime}`}
          />
        </Card>
      })}
      <Button onClick={onClickAdd} type="primary" icon={<PlusOutlined />}>添加</Button>
    </Space>
    <EditModal visible={visible} status={status} publishEnv={publishEnv} onOk={onOk} onCancel={onCancel} />
  </Card>
}