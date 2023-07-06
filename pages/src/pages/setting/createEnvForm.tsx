import React, { useState } from 'react';
import { Button, Form, Input, Modal, Radio } from 'antd';

interface Values {
  name: string;
  description?: string;
}

interface CreateFormProps {
  open: boolean;
  onCreate: (values: Values) => void;
  onCancel: () => void;
}

const CreateForm: React.FC<CreateFormProps> = ({
  open,
  onCreate,
  onCancel,
}) => {
  const [form] = Form.useForm();
  return (
    <Modal
      open={open}
      title="创建发布环境"
      okText="确认"
      cancelText="取消"
      onCancel={onCancel}
      mask={false}
      onOk={() => {
        form
          .validateFields()
          .then((values) => {
            form.resetFields();
            onCreate(values);
          })
          .catch((info) => {
            console.log('Validate Failed:', info);
          });
      }}
    >
      <Form
        form={form}
        // layout="vertical"
        name="form_in_modal"
      >
        <Form.Item
          name="name"
          label="名称"
          extra="名称一旦创建无法修改，会展示在发布的按钮和版本管理的筛选项中，尽量使用语义化的名称"
          rules={[{ required: true, message: '请填写环境名称' }]}
        >
          <Input placeholder='用中文和英文表示，比如日常环境，线上环境' />
        </Form.Item>
        {/* <Form.Item name="description" label="Description">
          <Input type="textarea" />
        </Form.Item>
        <Form.Item name="modifier" className="collection-create-form_last-form-item">
          <Radio.Group>
            <Radio value="public">Public</Radio>
            <Radio value="private">Private</Radio>
          </Radio.Group>
        </Form.Item> */}
      </Form>
    </Modal>
  );
};

export default CreateForm