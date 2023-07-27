import React, { useEffect, useRef, useState } from 'react'
import { Form, Input, Card, Button } from 'antd'
import API from "@mybricks/sdk-for-app/api";
import { _NAMESPACE_ } from "../app";
import dayjs from "dayjs";
import { TConfigProps } from '../useConfig';
const { Meta } = Card;

const fieldName = `publishApi`

export default ({ config, mergeUpdateConfig, loading, user }: TConfigProps) => {
  const [form] = Form.useForm();

  const publishApiConfig = config?.publishApiConfig || {}
  useEffect(() => {
    form.setFieldsValue(publishApiConfig)
  }, [publishApiConfig])

  const onSubmit = (values) => {
    const updateTime = dayjs(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    mergeUpdateConfig({
      publishApiConfig: { ...values, updateTime, user: user?.email }
    })
  }

  const onReset = () => {
    const updateTime = dayjs(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    mergeUpdateConfig({
      publishApiConfig: { [fieldName]: '', updateTime, user: user?.email }
    }).finally(() => {
      form.resetFields()
    })
  }

  return <>
    <Form form={form} onFinish={onSubmit} onReset={onReset} style={{ marginTop: 12 }}>
      <Form.Item name={fieldName} label="发布接口地址" required rules={[{ required: true, message: '请输入发布接口' }]}>
        <Input placeholder='https://my.mybricks.world/publish' />
      </Form.Item>
      <Form.Item style={{ textAlign: 'right' }}>
        {Object.keys(publishApiConfig).length > 0 && <Meta description={`${publishApiConfig.user} 更新于 ${publishApiConfig.updateTime}`} />}
        <Button htmlType='reset' style={{ marginRight: 8 }}>清空</Button>
        <Button type="primary" htmlType="submit">
          提交
        </Button>
      </Form.Item>
    </Form>
  </>
}