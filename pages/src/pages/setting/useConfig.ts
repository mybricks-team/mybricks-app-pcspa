import React, { useCallback, useEffect, useRef, useState } from 'react'
import API from '@mybricks/sdk-for-app/api'

export type TConfigProps<T = any> = {
  config: T,
  mergeUpdateConfig: (values: Partial<T>) => Promise<void>,
  loading: boolean,
  user: {
    email: string,
  }
}

export default <T = any>(namespace, defaultValue = {} as T): TConfigProps<T> => {
  const [config, setConfig] = useState<T>(defaultValue)
  const lastConfigRef = useRef<T>({} as T)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    API.User.getLoginUser().then(user => {
      setUser(user)
    })
    setLoading(true)
    API.Setting.getSetting([namespace]).then((res) => {
      try {
        const newConfig = JSON.parse(res[namespace]?.config)
        setConfig(newConfig)
        lastConfigRef.current = newConfig ?? {};
      } catch (error) {
        setConfig({})
        return
      }

    }).finally(() => {
      setLoading(false);
    });
  }, [])

  // 合并更新，参数只提供要修改的部分即可
  const mergeUpdateConfig = useCallback((values: Partial<T>) => {
    setLoading(true)
    const config = { ...lastConfigRef.current, ...values }
    return API.Setting.saveSetting(namespace, JSON.stringify(config), user?.id).then(() => {
      setConfig({ ...config });
    }).finally(() => {
      setLoading(false);
    });
  }, [user])

  return { config, mergeUpdateConfig, loading, user }
}