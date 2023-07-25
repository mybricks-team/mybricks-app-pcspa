import React, { useEffect, useState } from 'react'
import API from '@mybricks/sdk-for-app/api'

import ConfigComlib from './ConfigComlib'
import ServerConfig from './ServerConfig'
import PublishCconfig from './PublishCconfig'
import useConfig from './useConfig'
import ConfigPlugin from './ConfigPlugin'

export const _NAMESPACE_ = 'mybricks-app-pcspa'

export default () => {
  const configContext = useConfig(_NAMESPACE_, {})

  return (
    <div style={{ padding: 24 }}>
      <ServerConfig {...configContext} />
      <PublishCconfig {...configContext} />
    </div>
  )
}
