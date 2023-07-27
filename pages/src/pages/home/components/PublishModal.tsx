import React, { useEffect, useMemo } from "react";
import { Modal, Select, Form, Input, ModalProps } from "antd";

export default ({
  visible,
  onOk,
  onCancel,
  envList
}: ModalProps & { envList: Array<any> }) => {

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

  const envOptions = useMemo(() => {
    return envList.map(item => ({
      value: item.name,
      label: item.title
    }))
  }, [envList])

  return (
    <Modal
      visible={visible}
      width={600}
      title={"选择发布环境"}
      closable={false}
      okText="发布"
      cancelText="取消"
      maskClosable={false}
      onOk={_onOk}
      onCancel={onCancel}
    >
      <Form form={form} labelCol={{ span: 5 }} wrapperCol={{ span: 19 }}>
        <Form.Item
          label="发布环境"
          name="envType"
          required
          rules={[{ required: true, message: "请选择发布环境" }]}
        >
          <Select options={envOptions} />
        </Form.Item>
        <Form.Item
          label="发布内容"
          name="commitInfo"
          required
          rules={[{ required: true, message: "请填写本次发布的内容" }, { min: 4, message: '发布的内容不少于四个字' }]}
        >
          <Input placeholder="请输入本次发布的内容" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
