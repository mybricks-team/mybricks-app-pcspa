import renderUI from './renderUI'
import '@/reset.less'

const React = window.React;
const ReactDOM = window.ReactDOM;
const antd = window.antd;

let reactRoot

const getCurrentLocale = ()=>{
  const LanToMUILocale = {
    //key: 语言环境
    //value: antd包名
    'zh-CN': 'zh_CN',
    'en': 'en_US',
  }
  if (LanToMUILocale[navigator.language]) {
    return LanToMUILocale[navigator.language]
  } else {
    return;
  }
}

const render = (props) => {
    const { container } = props;
  const root = (container || document).querySelector('#mybricks-page-root')
  /** publish template style */
  root.style.width = '100%';
  root.style.height = '100%';
  if (props?.canvasElement) {
    antd.message?.config({
      getContainer() {
        return props?.canvasElement
      },
    })
  }
  // ReactDOM.render(
  //   React.createElement(
  //     antd.ConfigProvider,
  //     {
  //       locale: antd.locale['zh_CN'].default,
  //     },
  //     renderUI({...props, renderType: 'react'})
  //   ),
  //   root
  // )
  reactRoot = ReactDOM.createRoot(root);

  reactRoot.render(React.createElement(
    antd.ConfigProvider,
    {
      locale: getCurrentLocale() === 'en_US' ? 
              undefined : 
              (
                getCurrentLocale() !== undefined && antd.locale[getCurrentLocale()].default ? 
                 antd.locale[getCurrentLocale()].default : 
                antd.locale['zh_CN'].default
              ),
    },
    renderUI({...props, renderType: 'react', locale: getCurrentLocale })
  ));
}

if (!window.__POWERED_BY_QIANKUN__) {
    render({});
}

export async function bootstrap() {
    console.log('react app bootstrap');
}

export async function mount(props) {
    render(props);
}

export async function unmount(props) {
    const { container } = props;
    // ReactDOM.unmountComponentAtNode((container ?? document).querySelector('#mybricks-page-root'));
    reactRoot.unmount()
}