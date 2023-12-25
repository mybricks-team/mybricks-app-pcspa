import React, { useEffect, useState } from 'react'
// import API from '@mybricks/sdk-for-app/api'

import ConfigServer from './ConfigServer'
import ConfigEnv from './ConfigEnv'
import useConfig from './useConfig'
import ConfigPlugin from './ConfigPlugin'
import ConfigBase from './ConfigBase'
export const _NAMESPACE_ = APP_NAME
import style from './app.less'
import { Collapse, Spin } from 'antd'

export default (props) => {
  const { options = {} } = props
  const configContext = useConfig(_NAMESPACE_, {}, options)

  const isInGroup = options?.type === 'group'

  return (
    <Spin spinning={configContext.loading}>
      <Collapse style={{ padding: 24 }} className={style.wrapper} defaultActiveKey={[1, 2, 3, 4]}>
        {
          !isInGroup && (
            <>
              <Collapse.Panel key={1} header="基础设置">
                <ConfigBase {...configContext} />
              </Collapse.Panel> 
              <Collapse.Panel key={2} header="服务扩展">
                <ConfigServer {...configContext} />
              </Collapse.Panel>
            </>
          )
        }
        {/* {!isInGroup && <Collapse.Panel key={1} header="基础设置">
          <ConfigBase {...configContext} />
        </Collapse.Panel>}
        {!isInGroup && <Collapse.Panel key={2} header="服务扩展">
          <ConfigServer {...configContext} />
        </Collapse.Panel>} */}
        <Collapse.Panel key={3} header="发布环境">
          <ConfigEnv {...configContext} />
        </Collapse.Panel>
        {!isInGroup && <Collapse.Panel key={4} header="插件扩展">
          <ConfigPlugin {...configContext} />
        </Collapse.Panel>}
      </Collapse>
    </Spin>
  )
}
