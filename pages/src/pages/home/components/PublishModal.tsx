import React, { useEffect, useMemo, useState } from "react";
import { Modal, Select, Form, Radio, ModalProps } from "antd";
import TextArea from "antd/lib/input/TextArea";
import { USE_CUSTOM_HOST } from "../constants";

export enum EnumMode {
  DEFAULT,
  ENV,
  CUSTOM
}

export default ({
  visible,
  onOk,
  onCancel,
  envList,
  projectId
}: ModalProps & { envList: Array<any>, projectId?: string }) => {

  const [mode, setMode] = useState(envList.length > 0 ? EnumMode.ENV : EnumMode.DEFAULT)
  const [form] = Form.useForm();

  const _onOk = () => {
    form
      .validateFields()
      .then((values) => {
        let { envType, commitInfo } = values
        if (mode === EnumMode.CUSTOM) {
          envType = USE_CUSTOM_HOST
        }
        onOk({
          envType,
          commitInfo
        });
      })
      .catch((error) => {
        console.log(error);
      });
  };

  const envOptions = useMemo(() => {
    if (projectId) {
      return [{ label: '测试环境', value: 'staging' }, { label: '线上环境', value: 'prod' }];
    }
    return envList.map(item => ({
      value: item.name,
      label: item.title
    }))
  }, [envList])

  const hasEnv = envOptions.length > 0

  useEffect(() => {
    if (visible) {
      form.resetFields()
    }
  }, [visible])

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
      zIndex={1001}
    >
      <Form form={form} labelCol={{ span: 5 }} wrapperCol={{ span: 19 }}>
        {projectId
          ? null
          : <Form.Item
            label="发布模式"
            name="mode"
            required
          >
            <Radio.Group defaultValue={mode} onChange={e => setMode(e.target.value)}>
              {hasEnv ? <Radio value={EnumMode.ENV}>选择环境</Radio> : <Radio value={EnumMode.DEFAULT}>默认</Radio>}
              <Radio value={EnumMode.CUSTOM}>自定义域名</Radio>
            </Radio.Group>
          </Form.Item>
        }
        {mode === EnumMode.ENV && <Form.Item
          label="发布环境"
          name="envType"
          required
          rules={[{ required: true, message: "请选择发布环境" }]}
        >
          <Select options={envOptions} placeholder="请选择发布环境" />
        </Form.Item>}
        <Form.Item
          label="发布内容"
          name="commitInfo"
          required
          rules={[{ required: true, message: "请填写本次发布的内容" }, { min: 4, message: '发布的内容不少于四个字' }]}
        >
          <TextArea placeholder="请输入本次发布的内容" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
