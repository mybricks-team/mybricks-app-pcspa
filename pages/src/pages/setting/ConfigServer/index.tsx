import React, { useEffect, useRef, useState } from 'react'
import { Form, Input, Card, Button } from 'antd'
import API from "@mybricks/sdk-for-app/api";
import { _NAMESPACE_ } from "../app";
import dayjs from "dayjs";


const { Meta } = Card;

type UploadConfigType = Partial<{
    user: string;
    updateTime: string;
    uploadService: string;
}>

type UploadService = (file: File) => ({ url: string })  //上传服务接口定义


export default ({ user }) => {
    const [uploadConfig, setConfig] = useState<UploadConfigType>({})
    const lastConfigRef = useRef({})
    const [loading, setLoading] = useState<boolean>(true)
    useEffect(() => {
        API.Setting.getSetting([_NAMESPACE_]).then((res) => {
            setConfig(res[_NAMESPACE_]?.config ? JSON.parse(res[_NAMESPACE_]?.config).uploadServer ?? {} : {})
            lastConfigRef.current = res[_NAMESPACE_]?.config ?? {};
        }).finally(() => {
            setLoading(false);
        });
    }, []);
    const onSubmit = (values) => {
        setLoading(true)
        const updateTime = dayjs(Date.now()).format("YYYY-MM-DD HH:mm:ss");
        const config = { ...lastConfigRef.current, uploadServer: { ...values, updateTime, user: user?.email } }
        API.Setting.saveSetting(_NAMESPACE_, JSON.stringify(config), user.email).then(() => {
            setConfig({ ...values, updateTime, user: user?.email });
        }).finally(() => {
            setLoading(false);
        });

    }
    return <Card title="服务地址" style={{ width: '50vw' }} loading={loading}>
        <Form onFinish={onSubmit} initialValues={uploadConfig}>
            <Form.Item name="uploadService" label="上传接口地址" required rules={[{ required: true, message: '请输入服务接口' }]}>
                <Input />
            </Form.Item>
            <Form.Item style={{ textAlign: 'right' }}>
                <Button type="primary" htmlType="submit">
                    提交
                </Button>
            </Form.Item>
        </Form>
        {Object.keys(uploadConfig).length > 0 && <Meta description={`${uploadConfig.user} 更新于 ${uploadConfig.updateTime}`} />}
    </Card>
}