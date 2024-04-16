import React from 'react'

import { View } from '@mybricks/sdk-for-app/ui'

import Designer from './designer'

import './prerender'

import '@/reset.less'

export default function App() {

  return (
    <View
      onLoad={(appData) => {
        console.log(appData, 'appData')
        return <Designer appData={appData} />
      }}
    />
  )
}