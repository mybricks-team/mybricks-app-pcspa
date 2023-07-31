import React, { useEffect, useState } from 'react'
import API from '@mybricks/sdk-for-app/api'

import ServerConfig from './ConfigServer'
import ConfigEnv from './ConfigEnv'
import useConfig from './useConfig'
import ConfigPlugin from './ConfigPlugin'
export const _NAMESPACE_ = 'mybricks-app-pcspa'
import style from './app.less'

export default () => {
  const configContext = useConfig(_NAMESPACE_, {})

  return (
    <div style={{ padding: 24 }} className={style.wrapper}>
      <ServerConfig {...configContext} />
      <ConfigEnv {...configContext} />
      <ConfigPlugin {...configContext} />
    </div>
  )
}
