import React from 'react'
import { Agent, ChatPanel, IDBHistory, createRequestAsStream } from '@mybricks/plugin-ai'

export default {
  ChatPanel: (props) => {
    return (
      <ChatPanel
        {...props}
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