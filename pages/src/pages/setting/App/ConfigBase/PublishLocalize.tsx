import React, { useState, useEffect } from 'react'
import { Form, Card, Button, Switch, Input, Select } from 'antd'
import { _NAMESPACE_ } from "..";
import dayjs from "dayjs";
import { TConfigProps } from '../useConfig';
import API from '@mybricks/sdk-for-app/api'
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
        enableCompatible: !!values.enableCompatible,
        enableAI: !!values.enableAI,
        systemScenePrompt: values.systemScenePrompt ?? '',
        pcPageTemplateList: !!values.pcPageTemplateList ? values.pcPageTemplateList : [],
        updateTime,
        user: user?.email
      }
    });
  }

  const enableAI = Form.useWatch('enableAI', form);

  const [pcPageTemplateListOptions, setPcPageTemplateListOptions] = useState([]);

  useEffect(() => {
    API.Material.getMaterialList({
      type: "pc-page-template"
    }).then((res) => {
      console.log("[物料列表]", res.list)
      setPcPageTemplateListOptions(res.list.map(({ id, title }) => {
        return {
          label: title,
          value: id
        }
      }));
    })
  }, [])

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
        name="enableCompatible"
        label="兼容低版本浏览器"
        tooltip="开启后对发布后的产物开启兼容模式，兼容IE11和火狐52版本"
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
      <Form.Item
        name="pcPageTemplateList"
        label="模版扩展"
        tooltip="模版扩展"
      >
        <Select
          mode='multiple'
          placeholder='请选择需要扩展的模版'
          options={pcPageTemplateListOptions}
        />
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
