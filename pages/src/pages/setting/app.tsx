import React, { useEffect, useState } from 'react'
import API from '@mybricks/sdk-for-app/api'

import ConfigComlib from './ConfigComlib'

export const _NAMESPACE_ = 'mybricks-pc-page'

export default () => {
  const [loginUser, setLoginUser] = useState(null)

  useEffect(() => {
    API.User.getLoginUser().then(user => {
      setLoginUser(user)
    })

  }, [])

  return (
    <ConfigComlib user={loginUser} />
  )
}
