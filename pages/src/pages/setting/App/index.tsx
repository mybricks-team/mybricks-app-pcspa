import React, { useEffect, useState } from 'react'
// import API from '@mybricks/sdk-for-app/api'

import ConfigServer from './ConfigServer'
import ConfigEnv from './ConfigEnv'
import useConfig from './useConfig'
import ConfigPlugin from './ConfigPlugin'
import ConfigBase from './ConfigBase'
import ConfigDesigner from './ConfigDesigner'
export const _NAMESPACE_ = APP_NAME
import style from './app.less'
import { Collapse, Spin } from 'antd'

export default (props) => {
  const { options = {} } = props
  const configContext = useConfig(_NAMESPACE_, {}, options)

  const isInGroup = options?.type === 'group'
  // PC页面应用配置，设置=》PC页面 =》面板内容
  return (
    <Spin spinning={configContext.loading}>
      <Collapse style={{ padding: 24 }} className={style.wrapper} defaultActiveKey={[0, 1, 2, 3, 4]}>
        <Collapse.Panel key={0} header="设计器">
          <ConfigDesigner {...configContext} />
        </Collapse.Panel>
        {
          <>
            {!isInGroup && <Collapse.Panel key={1} header="基础设置">
              <ConfigBase {...configContext} />
            </Collapse.Panel>}
            <Collapse.Panel key={2} header="服务扩展">
              <ConfigServer {...configContext} />
            </Collapse.Panel>
          </>
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
