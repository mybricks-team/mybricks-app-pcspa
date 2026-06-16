import React from 'react'
import { Agent, ChatPanel, IDBHistory, createRequestAsStream } from '@mybricks/plugin-ai'

export default {
  ChatPanel: (props) => {
    return (
      <ChatPanel
        {...props}
        user={{
          name: '梁李昊',
          avatar: 'https://f2.eckwai.com/kos/nlav12333/aicode/logo/newlogo.png',
        }}
        copilot={{ name: 'MyBricks', avatar: 'https://my.mybricks.world/image/icon.png' }}
      />
    )
  },
  createAgent(props) {
    return new Agent({
      ...props,
      // key: "simple-chat",
      // history: new IDBHistory({
      //   dbName: "@plugin-ai/simple-chat",
      // }),
      request: (params) => {
        return createRequestAsStream()?.(params)
      },
    })
  }
}