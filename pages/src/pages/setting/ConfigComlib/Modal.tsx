import React, { useEffect, useMemo } from "react";
import { Modal, Form, Input, ModalProps } from "antd";

export type ComLibType = {
  namespace: string;
  title: string;
  rtJs: string;
  editJs: string;
  updateTime: string;
  avatar?: string;
  user: Record<string, any>;
};

interface AppendModalProps
  extends ModalProps,
    Partial<{
      status: "edit" | "append";
      comlib: ComLibType;
    }> {}

export default ({
  status,
  visible,
  comlib,
  onOk,
  onCancel,
}: AppendModalProps) => {
  const [form] = Form.useForm();
  const _onOk = () => {
    form
      .validateFields()
      .then((values) => {
        onOk(values);
      })
      .catch((error) => {
        console.log(error);
      });
  };

  const title = useMemo(
    () => (status === "edit" ? "更新组件库" : "添加组件库"),
    [status]
  );

  useEffect(() => {
    form.setFieldsValue(comlib);
    return () => form.resetFields();
  }, [comlib, visible]);

  return (
    <Modal
      visible={visible}
      width={600}
      title={title}
      closable={false}
      okText="保存"
      cancelText="取消"
      maskClosable={false}
      onOk={_onOk}
      onCancel={onCancel}
    >
      <Form form={form} labelCol={{ span: 5 }} wrapperCol={{ span: 19 }}>
        <Form.Item
          label="namespace"
          name="namespace"
          required
          rules={[{ required: true, message: "请输入组件库namespace" }]}
        >
          <Input disabled={status === "edit"} />
        </Form.Item>
        <Form.Item
          label="title"
          name="title"
          required
          rules={[{ required: true, message: "请输入组件库标题" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="rt地址"
          name="rtJs"
          required
          rules={[
            { required: true, message: "请输入rt资源地址" },
            { pattern: /.*rt\.js$/, message: "请输入正确的rt资源地址" },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="edit地址"
          name="editJs"
          required
          rules={[
            { required: true, message: "请输入edit资源地址" },
            { pattern: /.*edit\.js$/, message: "请输入正确的edit资源地址" },
          ]}
        >
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};
