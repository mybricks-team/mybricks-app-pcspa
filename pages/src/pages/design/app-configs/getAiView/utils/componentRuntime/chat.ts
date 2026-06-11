import { IDBHistory } from '/Users/lianglihao/Documents/GitHub/plugin-ai/packages/plugin/src/index'
import { requestAsStreamInfra } from '/Users/lianglihao/Documents/GitHub/plugin-ai/packages/request/src/cdzd'

export default {
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