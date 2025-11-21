import React, { useEffect } from 'react'
import { Form, Input, Card, Button, Popconfirm } from 'antd'
import { _NAMESPACE_ } from "..";
import dayjs from "dayjs";
import { TConfigProps } from '../useConfig';
const { Meta } = Card;

const fieldName = `pageDepsAPI`

export default ({ config, mergeUpdateConfig, loading, user }: TConfigProps) => {
  const [form] = Form.useForm();

  const pageDepsApiConfig = config?.pageDepsApiConfig || {}
  useEffect(() => {
    form.setFieldsValue(pageDepsApiConfig)
  }, [pageDepsApiConfig])

  const onSubmit = (values) => {
    const updateTime = dayjs(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    mergeUpdateConfig({
      pageDepsApiConfig: { ...values, updateTime, user: user?.email }
    })
  }

  const onReset = () => {
    const updateTime = dayjs(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    mergeUpdateConfig({
      pageDepsApiConfig: { [fieldName]: '', updateTime, user: user?.email }
    }).finally(() => {
      form.resetFields()
    })
  }

  return <>
    <Form form={form} onFinish={onSubmit} style={{ marginTop: 12 }}>
      <Form.Item
        name={fieldName}
        label="依赖上报接口"
        required
        tooltip="保存时，会自动将页面的依赖（组件库，云组件）上报至该接口"
      >
        <Input placeholder='依赖上报接口' />
      </Form.Item>
      <Form.Item style={{ textAlign: 'right' }}>
        {Object.keys(pageDepsApiConfig).length > 0 && <Meta description={`${pageDepsApiConfig.user} 更新于 ${pageDepsApiConfig.updateTime}`} />}
        <Popconfirm
          title={`确定清空依赖上报接口吗？`}
          onConfirm={onReset}
          okText="确定"
          cancelText="再想想"
        >
          <Button htmlType='reset' style={{ marginRight: 8 }}>清空</Button>
        </Popconfirm>
        <Button type="primary" htmlType="submit">
          保存
        </Button>
      </Form.Item>
    </Form>
  </>
}