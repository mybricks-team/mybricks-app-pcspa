import workspace from './workspace'
import wrapper from './wrapper'
import chat from './chat'

export default {
  workspace,
  wrapper,
  chat,
  entryFile: 'frontend/index.tsx',
  disallowedDebugEnvs: ['mock'],
  mode: 'gui_card',
}
