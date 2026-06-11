import React, { useEffect, useRef, useState } from 'react'
import { ChatPanel, Agent, IDBHistory } from '/Users/lianglihao/Documents/GitHub/plugin-ai/packages/plugin/src/index'
import { requestAsStreamInfra } from '/Users/lianglihao/Documents/GitHub/plugin-ai/packages/request/src/cdzd'

import css from './index.less'

const chat = {
  agent: {
    key: "simple-chat",
    request: requestAsStreamInfra,
    history: new IDBHistory({
      dbName: "@plugin-ai/simple-chat",
    }),
    system: "你是一个闲聊助手",
  },
  panel: {
    user: {
      name: '梁李昊',
      avatar: 'https://f2.eckwai.com/kos/nlav12333/aicode/logo/newlogo.png',
    },
    header: false,
    copilot: { name: 'MyBricks', avatar: 'https://my.mybricks.world/image/icon.png' }
  }
}

const AIChatPanel = () => {
  const chatPanelRef = useRef(null)
  const [agent, setAgent] = useState<Agent>()

  useEffect(() => {
    try {
      const agent = new Agent(chat.agent)
      setAgent(agent)
    } catch (e) {
      console.error(e)
    }
  }, [])

  if (!agent) {
    return
  }

  return (
    <div className={css.chatPanel} data-zone-type='ai-fixed'>
      <ChatPanel
        ref={chatPanelRef}
        // @ts-ignore
        agent={agent}
        {...chat.panel}
      />
    </div>
  )
}

export default AIChatPanel