export default {
  entryFile: 'index.tsx',
  type: 'frontend',
  mode: 'gui_card',
  pattern: /^(?!.*\/server\/).+$/,
  getDependencies: () => {
    return {
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
