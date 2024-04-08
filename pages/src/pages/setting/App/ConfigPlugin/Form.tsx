import React, { useEffect, useMemo, useState } from "react";
import { Form, Input, Select } from "antd";
import { EnumPluginType, PluginType } from "./type";

export const pluginTypeMap = {
  [EnumPluginType.NORMAL]: "普通",
  [EnumPluginType.CONNECTOR]: "连接器",
};

interface AppendModalProps
  extends Partial<{
    isAppend: boolean;
    plugin: PluginType | any;
    updatePlugin: (values: PluginType) => void;
  }> {}

export default ({ isAppend, updatePlugin, plugin = {} }: AppendModalProps) => {
  const [form] = Form.useForm();
  const [currentType, setCurrentType] = useState(EnumPluginType.NORMAL);

  useEffect(() => {
    if (!plugin.type) {
      plugin.type = EnumPluginType.NORMAL;
    }
    setCurrentType(plugin.type);
    form.setFieldsValue(plugin);
    return () => form.resetFields();
  }, [plugin]);

  return (
    <Form
      form={form}
      labelCol={{ span: 5 }}
      wrapperCol={{ span: 19 }}
      labelAlign={"left"}
      onValuesChange={(_, values) => updatePlugin(values)}
    >
      <Form.Item
        label="插件标识"
        name="name"
        rules={[{ required: true, message: "请填写插件代码中定义的name" }]}
        tooltip="插件的唯一标识，与代码中的name一致"
      >
        <Input allowClear disabled={!isAppend} />
      </Form.Item>
      <Form.Item
        label="中文名称"
        name="title"
        rules={[{ required: true, message: "请填写插件名称" }]}
      >
        <Input allowClear />
      </Form.Item>
      <Form.Item
        label="插件类型"
        name="type"
        rules={[{ required: true, message: "请选择插件类型" }]}
      >
        <Select
          onChange={(val) => setCurrentType(val)}
          defaultValue={EnumPluginType.NORMAL}
          options={Object.keys(pluginTypeMap).map((item) => ({
            label: pluginTypeMap[item],
            value: item,
          }))}
        />
      </Form.Item>
      <Form.Item
        label="插件地址"
        name="url"
        rules={[{ required: true, message: "请填写插件地址" }]}
      >
        <Input.TextArea allowClear />
      </Form.Item>
      <Form.Item
        label="runtime地址"
        name="runtimeUrl"
        rules={
          currentType === EnumPluginType.CONNECTOR
            ? [{ required: true, message: "请填写插件Runtime地址" }]
            : []
        }
        extra="搭建页发布后，生产环境使用"
      >
        <Input.TextArea allowClear />
      </Form.Item>
      <Form.Item label="更新信息" name="description">
        <Input.TextArea allowClear />
      </Form.Item>
    </Form>
  );
};
