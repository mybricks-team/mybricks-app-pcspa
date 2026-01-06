import React, { useEffect } from 'react';
import { Button, Form, Input, Card, Switch } from 'antd';
import dayjs from 'dayjs';
import { TConfigProps } from '../useConfig';

const { Meta } = Card;
export default (props: TConfigProps) => {
  const { config, mergeUpdateConfig, user } = props
  const [form] = Form.useForm();

  const aiConfig = config?.ai || {}
  useEffect(() => {
    form.setFieldsValue(aiConfig)
  }, [aiConfig])

  const onSubmit = (values) => {
    const updateTime = dayjs(Date.now()).format('YYYY-MM-DD HH:mm:ss');
    if (values?.url === '') {
      delete values.url
    }
    mergeUpdateConfig({ ai: { ...values, updateTime, user: user?.email } });
  }

  return (
    <Form form={form} onFinish={onSubmit} style={{ marginTop: 12 }} layout='vertical'>
      <Form.Item
        name="systemScenePrompt"
        label="场景提示词"
        tooltip="场景提示词，输入的提示词将会补充到应用的系统提示词中，调整更符合场景的效果"
      >
        <Input.TextArea rows={5} placeholder="输入的提示词将会补充到应用的系统提示词中" />
      </Form.Item>
      <Form.Item
        name="enableDefaultEventFlow"
        label="生成事件流程"
        tooltip="开启后，执行「生成页面」操作时，会自动生成对应的事件流程"
      >
        <Switch />
      </Form.Item>
      <Form.Item style={{ textAlign: 'right' }}>
        {Object.keys(aiConfig).length > 0 && <Meta description={`${aiConfig.user} 更新于 ${aiConfig.updateTime}`} />}
        <Button type="primary" htmlType="submit">
          保存
        </Button>
      </Form.Item>
    </Form>
  );
}