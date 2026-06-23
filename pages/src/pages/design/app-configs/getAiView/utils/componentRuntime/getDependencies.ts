// @ts-ignore
import { Agent, ChatPanel, IDBHistory, createRequestAsStream } from '@mybricks/plugin-ai'

const getDependencies = () => {
  return {
    '@mybricks/plugin-ai': {
      version: '1.0.0',
      readme: '',
      module: {
        ChatPanel
      }
    },
    'antd': {
      version: '5.21.4',
      readme: '',
      module: window['antd_5_21_4']
    },
  }
}

export default getDependencies
