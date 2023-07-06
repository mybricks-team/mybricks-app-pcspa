import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Button,
  message,
  Modal,
  Card,
  Empty,
  Form,
  Select,
  Input,
} from 'antd'
import {
  PlusOutlined,
  SettingOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import API from '@mybricks/sdk-for-app/api'
import { FileService, VersionService } from './../../services'

import CreateEnvForm from './createEnvForm'
import ConfigComlib from './ConfigComlib'

import styles from './app.less'

export const _NAMESPACE_ = 'mybricks-pc-page'

export default () => {
  const [config, setConfig] = useState({})
  const [files, setFiles] = useState([])
  const [loginUser, setLoginUser] = useState(null)
  const [versionMap, setVersionMap] = useState({})
  const [saveLoading, setSaveLoading] = useState(false)
  const [envFormVisible, setEnvFormVisible] = useState<boolean>(false)
  const [form] = Form.useForm()

  useEffect(() => {
    API.Setting.getSetting([_NAMESPACE_]).then((configMap) => {
      setConfig(configMap?.[_NAMESPACE_]?.config ?? {})
    })

    API.User.getLoginUser().then(user => {
      setLoginUser(user)
    })

    FileService.getSysTemFiles({ extName: 'workflow' }).then((files) => {
      setFiles(files)
    })
  }, [])

  const getVersionByFileId = useCallback((fileId) => {
    VersionService.getPublishVersions({ fileId }).then((files) => {
      setVersionMap((c) => ({ ...c, [fileId]: files }))
    })
  }, [])

  useEffect(() => {
    if (!config || !config?.publishEnv) {
      return
    }

    const newConfig = JSON.parse(JSON.stringify(config))
    newConfig.publishEnvs = Object.keys(newConfig.publishEnv).map((keyName) => {
      return {
        name: decodeURI(keyName),
        ...(newConfig.publishEnv?.[keyName] ?? {}),
      }
    })

    delete newConfig.publishEnv

    form?.setFieldsValue?.(newConfig)
    /** 查询当前所有文件的版本 */
    const existFileIds = newConfig.publishEnvs
      .map((t) => t.fileId)
      .filter((t) => !!t)

    existFileIds.forEach((fileId) => {
      getVersionByFileId(fileId)
    })
  }, [form, config])

  const handleSubmit = useCallback(() => {
    form?.validateFields().then((values) => {
      setSaveLoading(true)
      const newVals = JSON.parse(JSON.stringify(values))
      const publishEnvs = newVals.publishEnvs
      delete newVals.publishEnvs
      publishEnvs.forEach((env, index) => {
        const { name, ...others } = env
        if (!newVals.publishEnv) {
          newVals.publishEnv = {}
        }
        newVals.publishEnv[encodeURI(name)] = { ...others, index }
      })
      API.Setting.saveSetting(_NAMESPACE_, newVals, loginUser?.email)
        .then(() => {
          message.success('修改成功')
        })
        .finally(() => {
          setSaveLoading(false)
        })
    })
  }, [])

  const openTask = useCallback((fileId) => {
    window.open(`/app-workflow/app-workflow.html?id=${fileId}`)
  }, [])

  const publishEnvs = Form.useWatch('publishEnvs', form) || [];

  return (
    <ConfigComlib user={loginUser} />
	  

    // <div className={`${styles.body}`}>
    //   <Form
    //     form={form}
    //     name="setting"
    //     labelAlign="left"
    //     onFinish={() => {}}
    //     autoComplete="off"
    //     className={styles.form}
    //   >
    //     <Form.List name="publishEnvs">
    //       {(fields, { add, remove }) => (
    //         <div className={styles.envs}>
    //           <div className={styles.title}>
    //             发布环境管理
    //             <Button
    //               type="link"
    //               onClick={() => setEnvFormVisible(true)}
    //               block
    //               style={{ width: 150 }}
    //               icon={<PlusOutlined />}
    //             >
    //               新增发布环境
    //             </Button>
    //           </div>
    //           {fields.map((field) => (
    //             <Card
    //               className={styles.envCard}
    //               key={field.key}
    //               actions={[
    //                 // <EditOutlined key="setting" />
    //                 <div
    //                   key="edit"
    //                   onClick={() => {
    //                     if (!publishEnvs[field.name]?.fileId) {
    //                       message.warn('请先选择任务')
    //                       return
    //                     }
    //                     openTask(publishEnvs[field.name]?.fileId)
    //                   }}
    //                 >
    //                   <EditOutlined />
    //                   <span style={{ marginLeft: 5 }}>编排任务</span>
    //                 </div>,
    //                 <div
    //                   key="delete"
    //                   onClick={() => {
    //                     Modal.confirm({
    //                       title: `删除任务「${publishEnvs?.[field.name]?.name}」`,
    //                       content:
    //                         '删除任务后搭建应用将无法发布页面到此环境，请谨慎操作!',
    //                       okText: '我已知晓，确认删除',
    //                       cancelText: '取消',
    //                       onOk: () => remove(field.name),
    //                       mask: false,
    //                     })
    //                   }}
    //                 >
    //                   <DeleteOutlined />
    //                   <span style={{ marginLeft: 5 }}>删除</span>
    //                 </div>,
    //               ]}
    //             >
    //               <Card.Meta
    //                 title={publishEnvs?.[field.name]?.name}
    //                 description={`${publishEnvs?.[field.name]?.name}发布环境`}
    //               />
    //               <Form.Item
    //                 {...field}
    //                 label="任务"
    //                 name={[field.name, 'fileId']}
    //                 style={{ marginTop: 20 }}
    //                 rules={[{ required: true, message: '请填写任务' }]}
    //                 // validateTrigger={['onBlur', 'onChange']}
    //               >
    //                 <Select
    //                   showSearch
    //                   filterOption={(input = '', option) => {
    //                     const _label = (
    //                       typeof option?.label === 'string' ? option?.label : ''
    //                     ).toLowerCase()
    //                     const _value = (
    //                       typeof option?.value === 'string' ? option?.value : ''
    //                     ).toLowerCase()
    //                     const _input = input.toLowerCase()
    //                     return (
    //                       _label.includes(_input) || _value.includes(_input)
    //                     )
    //                   }}
    //                   options={files.map((file) => ({
    //                     label: file?.name,
    //                     value: file?.id,
    //                   }))}
    //                   onChange={(fileId) => {
    //                     form.setFieldValue(
    //                       ['publishEnvs', field.name, 'version'],
    //                       ''
    //                     )
    //                     getVersionByFileId(fileId)
    //                   }}
    //                 />
    //               </Form.Item>
    //               <Form.Item
    //                 {...field}
    //                 label="版本"
    //                 name={[field.name, 'version']}
    //                 rules={[{ required: true, message: '请填写版本' }]}
    //                 // validateTrigger={['onBlur', 'onChange']}
    //               >
    //                 <Select
    //                   options={versionMap?.[
    //                     publishEnvs?.[field.name]?.fileId
    //                   ]?.map((version) => {
    //                     return {
    //                       label: version?.version,
    //                       value: version?.version,
    //                     }
    //                   })}
    //                   notFoundContent={
    //                     '当前任务无发布版本，请先点击下方编排按钮去发布'
    //                   }
    //                 />
    //               </Form.Item>
    //             </Card>
    //             // <Space key={field.key} align="baseline">

    //             // <MinusCircleOutlined onClick={() => remove(field.name)} />
    //             // </Space>
    //           ))}
    //           <CreateEnvForm
    //             open={envFormVisible}
    //             onCreate={({ name }) => {
    //               const hasRepeatName = (publishEnvs || []).some(
    //                 (item) => item.name === name
    //               )
    //               if (hasRepeatName) {
    //                 message.warn(`名称「${name}」已被使用，请重新取名`)
    //                 return
    //               }
    //               add?.({ name })
    //               setEnvFormVisible(false)
    //             }}
    //             onCancel={() => setEnvFormVisible(false)}
    //           />
    //         </div>
    //       )}
    //     </Form.List>
    //   </Form>
    //   <div className={styles.btnGroups}>
    //     <Button
    //       style={{ position: 'absolute', right: 0 }}
    //       type="primary"
    //       onClick={handleSubmit}
    //       loading={saveLoading}
    //     >
    //       保存
    //     </Button>
    //   </div>
    // </div>
  )
}
