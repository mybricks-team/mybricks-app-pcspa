import workspace from './workspace'
import wrapper from './wrapper'
import chat from './chat'

export default {
  version: 1,
  workspace,
  wrapper,
  chat,
  entryFile: 'frontend/index.tsx',
  disallowedDebugEnvs: ['mock'],
  mode: 'gui_card',
  eslint: {
    rules: {
      'requirement-check': 'off',
      'jsdoc-check': [{ datasource: 'off', state: 'off' }]
    },
  },
}
