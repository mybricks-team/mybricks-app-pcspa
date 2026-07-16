import React from 'react'
import { CodeAgent, ChatPanel, IDBHistory, copilotAgentOptionBuilder, copilotAppPromptBuilder, IDBSandbox, createRequestAsStream } from '@mybricks/plugin-ai'

export default {
  ChatPanel: (props) => {
    return (
      <ChatPanel
        {...props}
      />
    )
  },
  createAgent(props) {
    return new CodeAgent(copilotAgentOptionBuilder({
      ...props,
      ...copilotAppPromptBuilder({
        name: '个人助手',
        soulMd: props?.soulMd,
        agentsMd: props?.agentsMd
      }),
      sandbox: new IDBSandbox({
        key: `${props.key}:sandbox`,
      }),
      request: (params) => {
        return createRequestAsStream()?.(params)
      },
    }))
  }
}