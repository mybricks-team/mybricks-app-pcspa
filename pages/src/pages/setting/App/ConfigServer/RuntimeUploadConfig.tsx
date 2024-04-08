import React, { useEffect, useRef, useState } from "react";
import { Form, Input, Card, Button, Popconfirm } from "antd";
import API from "@mybricks/sdk-for-app/api";
import { _NAMESPACE_ } from "..";
import dayjs from "dayjs";
import { TConfigProps } from "../useConfig";
const { Meta } = Card;

export default ({ config, mergeUpdateConfig, user }: TConfigProps) => {
  const [form] = Form.useForm();

  const uploadConfig = config?.runtimeUploadServer || {};
  useEffect(() => {
    form.setFieldsValue(uploadConfig);
  }, [uploadConfig]);

  const onSubmit = (values) => {
    const updateTime = dayjs(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    mergeUpdateConfig({
      runtimeUploadServer: { ...values, updateTime, user: user?.email },
    });
  };

  return (
    <>
      <Form
        form={form}
        onFinish={onSubmit}
        onValuesChange={(_, values) => onSubmit(values)}
      >
        <Form.Item
          name="uploadService"
          label="运行时文件上传接口"
          required
          rules={[{ required: true, message: "请输入服务接口" }]}
          tooltip="该接口用于在发布后的页面中上传静态文件"
        >
          <Input />
        </Form.Item>
        {Object.keys(uploadConfig).length > 0 && (
          <Form.Item style={{ textAlign: "right" }}>
            <Meta
              description={`${uploadConfig.user} 更新于 ${uploadConfig.updateTime}`}
            />
          </Form.Item>
        )}
      </Form>
    </>
  );
};
