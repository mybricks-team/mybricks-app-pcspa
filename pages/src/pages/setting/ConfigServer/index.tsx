import React, { useEffect, useRef, useState } from 'react'
import { Form, Input, Card, Button } from 'antd'
import API from "@mybricks/sdk-for-app/api";
import { _NAMESPACE_ } from "../app";
import dayjs from "dayjs";
import { TConfigProps } from '../useConfig';
import UploadConfig from './UploadConfig'
import PublishApi from './PublishApi'
const { Meta } = Card;

export default (props: TConfigProps) => {
  const { config, mergeUpdateConfig, loading, user } = props
  const [form] = Form.useForm();

  const uploadConfig = config?.uploadServer || {}
  useEffect(() => {
    form.setFieldsValue(uploadConfig)
  }, [uploadConfig])

  const onSubmit = (values) => {
    const updateTime = dayjs(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    mergeUpdateConfig({
      uploadServer: { ...values, updateTime, user: user?.email }
    })
  }

  const onReset = () => {
    const updateTime = dayjs(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    mergeUpdateConfig({
      uploadServer: { uploadService: '', updateTime, user: user?.email }
    }).finally(() => {
      form.resetFields()

    })
  }

  return <>
    <UploadConfig {...props} />
    <PublishApi {...props} />
  </>
}