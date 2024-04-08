import React, { useEffect, useRef, useState } from "react";
import { Form, Input, Card, Button, Popconfirm } from "antd";
import API from "@mybricks/sdk-for-app/api";
import { _NAMESPACE_ } from "..";
import dayjs from "dayjs";
import { TConfigProps } from "../useConfig";
const { Meta } = Card;

const fieldName = `publishApi`;

export default ({ config, mergeUpdateConfig, user }: TConfigProps) => {
  const [form] = Form.useForm();

  const publishApiConfig = config?.publishApiConfig || {};
  useEffect(() => {
    form.setFieldsValue(publishApiConfig);
  }, [publishApiConfig]);

  const onSubmit = (values) => {
    const updateTime = dayjs(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    mergeUpdateConfig({
      publishApiConfig: { ...values, updateTime, user: user?.email },
    });
  };

  return (
    <>
      <Form
        form={form}
        onFinish={onSubmit}
        style={{ marginTop: 12 }}
        onValuesChange={(_, values) => onSubmit(values)}
      >
        <Form.Item
          name={fieldName}
          label="发布集成接口"
          required
          rules={[{ required: true, message: "请输入发布接口" }]}
          tooltip="发布时会自动调用该接口向用户系统发送产物信息（如html页面内容）"
        >
          <Input placeholder="https://my.mybricks.world/publish" />
        </Form.Item>
        {Object.keys(publishApiConfig).length > 0 && (
          <Form.Item style={{ textAlign: "right" }}>
            <Meta
              description={`${publishApiConfig.user} 更新于 ${publishApiConfig.updateTime}`}
            />
          </Form.Item>
        )}
      </Form>
    </>
  );
};
