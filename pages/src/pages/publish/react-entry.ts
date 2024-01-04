import renderUI from './renderUI'
import '@/reset.less'
import { scheduleTaskListen } from '../../utils/scheduleTask'

const React = window.React;
const ReactDOM = window.ReactDOM;
const antd = window.antd;

let reactRoot

const scheduleTask = scheduleTaskListen()

const getAntdLocalName = (locale) => {
  const localeArr = locale.split('-');
  const lang = localeArr.pop()?.toUpperCase();
  return localeArr.concat(['_', lang as string]).join('');
}

const getCurrentLocale = () => {
  return navigator.language
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
  reactRoot = ReactDOM.createRoot(root);
  const antdLocalLib = antd?.locale[getAntdLocalName(getCurrentLocale())]?.default

  reactRoot.render(
    React.createElement(
      antd.ConfigProvider,
      {
        // 如鬼哦没有因为就传入undefined使用默认的英文，否则使用指定的语言包，并以中文兜底
        locale: [`'en_US'`, `en`].includes(getAntdLocalName(getCurrentLocale()))
          ? undefined
          : antdLocalLib || antd.locale["zh_CN"].default,
      },
      renderUI({
        ...props,
        renderType: "react",
        locale: getCurrentLocale(),
        runtime: { onComplete: scheduleTask.addListen },
      })
    )
  );
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
  // const { container } = props;
  // ReactDOM.unmountComponentAtNode((container ?? document).querySelector('#mybricks-page-root'));
  scheduleTask.cleanListen()
  reactRoot.unmount()
}