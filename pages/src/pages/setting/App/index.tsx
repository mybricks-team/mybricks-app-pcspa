import React, { useEffect, useState } from 'react'
import API from '@mybricks/sdk-for-app/api'

import ConfigServer from './ConfigServer'
import ConfigEnv from './ConfigEnv'
import useConfig from './useConfig'
import ConfigPlugin from './ConfigPlugin'
export const _NAMESPACE_ = 'mybricks-app-pcspa'
import style from './app.less'
import { Collapse, Spin } from 'antd'

export default (props) => {
  const { options = {} } = props
  const configContext = useConfig(_NAMESPACE_, {}, options)

  const isInGroup = options?.type === 'group'
  return <Spin spinning={configContext.loading}>
    <Collapse style={{ padding: 24 }} className={style.wrapper} defaultActiveKey={[1, 2, 3]}>

      {!isInGroup && <Collapse.Panel key={1} header="服务地址">
        <ConfigServer {...configContext} />
      </Collapse.Panel>}
      <Collapse.Panel key={2} header="发布环境">
        <ConfigEnv {...configContext} />
      </Collapse.Panel>
      {!isInGroup && <Collapse.Panel key={3} header="插件配置">
        <ConfigPlugin {...configContext} />
      </Collapse.Panel>}
    </Collapse>
  </Spin>
}
