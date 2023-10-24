import renderUI from './renderUI'

const React = window.React;
const ReactDOM = window.ReactDOM;
const antd = window.antd;

let reactRoot

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
      locale: antd.locale['zh_CN'].default,
    },
    renderUI({...props, renderType: 'react'})
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