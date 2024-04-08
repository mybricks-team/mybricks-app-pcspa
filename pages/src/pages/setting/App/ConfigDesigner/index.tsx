import React, { useEffect } from 'react';
import { Button, Form, Input, Card } from 'antd';
import dayjs from 'dayjs';
import { TConfigProps } from '../useConfig';
import { DESIGNER_STATIC_PATH } from '../../../../constants'

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
    <Form
      form={form}
      onFinish={onSubmit}
      style={{ marginTop: 12 }}
      onValuesChange={(_, values) => onSubmit(values)}
    >
      <Form.Item name="url" label="链接" tooltip="相对路径或CDN">
        <Input placeholder={DESIGNER_STATIC_PATH} />
      </Form.Item>
      {Object.keys(designerConfig).length > 0 && (
        <Form.Item style={{ textAlign: "right" }}>
          <Meta
            description={`${designerConfig.user} 更新于 ${designerConfig.updateTime}`}
          />
        </Form.Item>
      )}
    </Form>
  );
};
