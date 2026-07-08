import workspace from './workspace'
import wrapper from './wrapper'
import chat from './chat'
import backend from './backend'
import frontend from './frontend'
import requestProxy, { honoApp } from './backend/requestProxy'
import mybricksPrompt from './mybricksPrompt'

export default {
  version: 1,
  workspace,
  wrapper,
  chat,
  eslint: {
    rules: {
      'requirement-check': 'off',
      'jsdoc-check': [{ datasource: 'off', state: 'off' }]
    },
  },
  modules: {
    backend,
    frontend
  },
  requestProxy,
  onDebug(debug) {
    if (debug) {
      honoApp.init()
    } else {
      honoApp.clear()
    }
  },
  mybricksPrompt,
}
