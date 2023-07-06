import React, { useEffect, useState } from 'react'
import API from '@mybricks/sdk-for-app/api'

import ConfigComlib from './ConfigComlib'
import ConfigServer from './ConfigServer'

export const _NAMESPACE_ = 'mybricks-app-pcspa-for-manatee'

export default () => {
  const [loginUser, setLoginUser] = useState(null)

  useEffect(() => {
    API.User.getLoginUser().then(user => {
      setLoginUser(user)
    })

  }, [])

  return (
    <div style={{ padding: 24 }}>
      <ConfigServer user={loginUser} />
    </div>
  )
}
