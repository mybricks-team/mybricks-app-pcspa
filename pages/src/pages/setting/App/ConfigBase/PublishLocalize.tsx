import React, { useEffect } from 'react'
import { Form, Card, Button, Switch } from 'antd'
import { _NAMESPACE_ } from "..";
import dayjs from "dayjs";
import { TConfigProps } from '../useConfig';
const { Meta } = Card;

const fieldName = `needLocalization`

export default ({ config, mergeUpdateConfig, loading, user }: TConfigProps) => {
  const [form] = Form.useForm();

  const publishLocalizeConfig = config?.publishLocalizeConfig || {};
  console.log(config)
  useEffect(() => {
    form.setFieldsValue(publishLocalizeConfig)
  }, [publishLocalizeConfig]);

  const onSubmit = (values) => {
    const updateTime = dayjs(Date.now()).format("YYYY-MM-DD HH:mm:ss");

    mergeUpdateConfig({
      publishLocalizeConfig: {
        ...publishLocalizeConfig,
        [fieldName]: !!values[fieldName],
        isEncode: !!values.isEncode,
        enableSplitCom: !!values.enableSplitCom,
        updateTime,
        user: user?.email
      }
    });
  }

  return <>
    <Form form={form} style={{ marginTop: 12 }}>
      <Form.Item
        name={fieldName}
        label="本地部署"
        tooltip="发布产物不会依赖公网资源"
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
      <Form.Item
        name="isEncode"
        label="数据编码"
        tooltip="开启后对保存、发布的数据进行编码，避免防火墙错误拦截"
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
      <Form.Item
        name="enableSplitCom"
        label="开启组件库分包"
        tooltip="开启后每个组件作为单独的js文件进行加载，提高加载速度，不同项目间可以共享同样的组件js文件。"
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
      <Form.Item style={{ textAlign: 'right' }}>
        {Object.keys(publishLocalizeConfig).length > 0 && <Meta description={`${publishLocalizeConfig.user} 更新于 ${publishLocalizeConfig.updateTime}`} />}
        <Button type="primary" htmlType="submit" onClick={() => { onSubmit(form.getFieldsValue()) }}>
          保存
        </Button>
      </Form.Item>
    </Form>
  </>
}
