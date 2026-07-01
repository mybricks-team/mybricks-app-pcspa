import workspace from './workspace'
import wrapper from './wrapper'
import chat from './chat'
import backend from './backend'
import frontend from './frontend'

export default {
  version: 1,
  workspace,
  wrapper,
  chat,
  disallowedDebugEnvs: ['mock'],
  eslint: {
    rules: {
      'requirement-check': 'off',
      'jsdoc-check': [{ datasource: 'off', state: 'off' }]
    },
  },
  modules: {
    backend,
    frontend
  }
}
