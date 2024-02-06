import React, { useEffect } from 'react';
import { Button, Form, Input, Card } from 'antd';
import dayjs from 'dayjs';
import { TConfigProps } from '../useConfig';

const { Meta } = Card;
export default (props: TConfigProps) => {
  const { config, mergeUpdateConfig, user } = props
  const [form] = Form.useForm();

  const designerConfig = config?.designer || {}
  useEffect(() => {
    form.setFieldsValue(designerConfig)
  }, [designerConfig])

  const onSubmit = (values) => {
    const updateTime = dayjs(Date.now()).format('YYYY-MM-DD HH:mm:ss');
    mergeUpdateConfig({ designer: { ...values, updateTime, user: user?.email } });
  }

  return (
    <Form form={form} onFinish={onSubmit} style={{ marginTop: 12 }}>
      <Form.Item
        name="url"
        label="链接"
        tooltip="相对路径或CDN"
      >
        <Input placeholder='./public/designer-spa/1.3.94.2/index.min.js' />
      </Form.Item>
      <Form.Item style={{ textAlign: 'right' }}>
        {Object.keys(designerConfig).length > 0 && <Meta description={`${designerConfig.user} 更新于 ${designerConfig.updateTime}`} />}
        <Button type="primary" htmlType="submit">
          保存
        </Button>
      </Form.Item>
    </Form>
  );
}