import { PC_NORMAL_COM_LIB, CHARS_COM_LIB, BASIC_COM_LIB } from '@/constants'
import { getQueryString, requireScript } from '@/utils'
import { PreviewStorage } from '@/utils/previewStorage'
import { call as callDomainHttp } from '@mybricks/plugin-connector-domain';
import renderUI from './renderUI'
import { getRtComlibsFromConfigEdit } from '../../utils/comlib'
import { insertDeps } from '../../utils/getComlibs'
import '@/reset.less'

const React = window.React;
const ReactDOM = window.ReactDOM;


const fileId = getQueryString('fileId')
const previewStorage = new PreviewStorage({ fileId })

let { dumpJson, comlibs } = previewStorage.getPreviewPageData()

if (!dumpJson) {
  throw new Error('数据错误：项目数据缺失')
}

if (!comlibs) {
  console.warn('数据错误: 组件库缺失')
  comlibs = [PC_NORMAL_COM_LIB, CHARS_COM_LIB, BASIC_COM_LIB]
}

function cssVariable(dumpJson) {
  const themes = dumpJson?.plugins?.['@mybricks/plugins/theme/use']?.themes
  if (Array.isArray(themes)) {
    themes.forEach(({ namespace, content }) => {
      const variables = content?.variables

      if (Array.isArray(variables)) {
        const style = document.createElement('style')
        style.id = namespace
        let innerHTML = ''

        variables.forEach(({ configs }) => {
          if (Array.isArray(configs)) {
            configs.forEach(({ key, value }) => {
              innerHTML = innerHTML + `${key}: ${value};\n`
            })
          }
        })

        style.innerHTML = `:root {\n${innerHTML}}`
        document.body.appendChild(style)
      }
    })
  }
}

cssVariable(dumpJson)

let reactRoot


const getAntdLocalName = (locale) => {
  const localeArr = locale.split('-');
  if (localeArr.length <= 1) {
    return locale
  }
  const lang = localeArr.pop()?.toUpperCase();
  return localeArr.concat(['_', lang as string]).join('');
}

const getCurrentLocale = () => {
  return navigator.language
}

async function render(props) {
  const { container } = props;
  if (comlibs && Array.isArray(comlibs)) {
    await insertDeps(comlibs)
    const antd = window.antd;
    Promise.all(getRtComlibsFromConfigEdit(comlibs).map((t) => requireScript(t))).then(() => {
      const lang = getAntdLocalName(getCurrentLocale())

      const antdLocalLib = antd?.locale![lang].default

      reactRoot = ReactDOM.createRoot((container ?? document).querySelector('#root'));

      reactRoot.render(React.createElement(
        antd.ConfigProvider,
        {
          // 如鬼没有就传入undefined使用默认的英文，否则使用指定的语言包，并以中文兜底
          locale: [`'en_US'`, `en`].includes(lang) ? undefined : (antdLocalLib || antd.locale['zh_CN'].default)
        },
        renderUI({
          ...props, renderType: 'react', env: {
            callDomainModel(domainModel, type, params) {
              return callDomainHttp(domainModel, params, { action: type } as any);
            },
            locale: getCurrentLocale()
          }
        })
      ));
    })
  }
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
  // ReactDOM.unmountComponentAtNode((container ?? document).querySelector('#root'));
  reactRoot.unmount();
}