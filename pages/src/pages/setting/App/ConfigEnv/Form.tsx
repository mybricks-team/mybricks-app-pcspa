import React, { useEffect } from "react";
import { Form, Input, ModalProps } from "antd";
import { TPublishEnv } from "./index";

interface AppendModalProps
  extends Partial<{
    isAppend: boolean;
    publishEnv: TPublishEnv;
    updateEnv: (values: TPublishEnv) => void;
  }> {}

export default ({ isAppend, publishEnv, updateEnv }: AppendModalProps) => {
  const [form] = Form.useForm();

  useEffect(() => {
    form.setFieldsValue(publishEnv);
    return () => form.resetFields();
  }, [publishEnv]);

  return (
    <Form
      form={form}
      labelCol={{ span: 5 }}
      wrapperCol={{ span: 19 }}
      labelAlign={"left"}
      onValuesChange={(_, values) => updateEnv(values)}
    >
      <Form.Item
        label="title"
        name="title"
        required
        rules={[{ required: true, message: "请输入环境标题" }]}
      >
        <Input placeholder="开发/测试/线上..." />
      </Form.Item>
      <Form.Item
        label="name"
        name="name"
        required
        rules={[{ required: true, message: "请输入环境的名称" }]}
      >
        <Input disabled={!isAppend} placeholder="dev/test/prod..." />
      </Form.Item>
      <Form.Item
        label="接口默认前缀"
        name="defaultApiPrePath"
        tooltip="该环境下发起的请求会自动带上此前缀（不包含已有域名前缀的接口）"
        rules={[{ pattern: /^https?:\/\/.+$/, message: "请输入正确的url地址" }]}
      >
        <Input placeholder="https://my.mybricks.world/publish" />
      </Form.Item>
    </Form>
  );
};
