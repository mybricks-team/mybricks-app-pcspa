import mybricksPrompt from '../mybricksPrompt'

export default {
  entryFile: 'index.tsx',
  type: 'frontend',
  mode: 'gui_card',
  gui_card: {
    icon: 'https://my.mybricks.world/image/icon.png'
  },
  pattern: /^(?!.*\/server\/).+$/,
  mybricksPrompt,
  getDependencies: () => {
    return {
      'dayjs': {
        version: '1.11.13',
        readme: '',
        module: window['dayjs']
      },
      'antd': {
        version: '5.21.4',
        readme: '',
        module: window['antd_5_21_4']
      },
      '@ant-design/icons': {
        version: '4.7.0',
        readme: '',
        module: window['icons']
      }
    }
  }
}
