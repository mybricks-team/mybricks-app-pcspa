import { PC_NORMAL_COM_LIB, CHARS_COM_LIB, BASIC_COM_LIB } from '@/constants'
import { getQueryString, requireScript } from '@/utils'
import { PreviewStorage } from '@/utils/previewStorage'
import { call as callDomainHttp } from '@mybricks/plugin-connector-domain';
import renderUI from './renderUI'
import { getRtComlibsFromConfigEdit } from '../../utils/comlib'
import { insertDeps } from '../../utils/getComlibs'
import '@/reset.less'
import { getLocaleLang } from '../setting/App/I18nConfig/utils';

const React = window.React;
const ReactDOM = window.ReactDOM;


const fileId = getQueryString('fileId')
const previewStorage = new PreviewStorage({ fileId })

let { dumpJson, comlibs, appConfig } = previewStorage.getPreviewPageData()

if (!dumpJson) {
  throw new Error('数据错误：项目数据缺失')
}

if (!comlibs) {
  console.warn('数据错误: 组件库缺失')
  comlibs = [PC_NORMAL_COM_LIB, CHARS_COM_LIB, BASIC_COM_LIB]
}

function cssVariable(dumpJson) {
  const themeData = dumpJson?.plugins?.['@mybricks/plugins/theme/use']

  if (themeData) {
    const { antdV4Variable, themes } = themeData
    if (antdV4Variable) {
      const localKey = localStorage.getItem("MYBRICKS_PLUGINS_THEME_KEY")
      let activeVariables;
      let localVariables;
      const variables = themes[0].content.variables;
      variables.forEach(({ active, key, variables }) => {
        if (active) {
          activeVariables = variables;
        }
        if (localKey === key) {
          localVariables = variables;
        }
      });
      const style = document.createElement('style');
      style.id = themes[0].namespace;
      let innerHTML = '';
      (localVariables || activeVariables || variables[0].variables).forEach(({ configs }) => {
        if (Array.isArray(configs)) {
          configs.forEach(({ key, value }) => {
            innerHTML = innerHTML + `${key}: ${value};\n`
          })
        }
      });
      antdV4Variable.configs.forEach(({ key, value }) => {
        innerHTML = innerHTML + `${key}: ${value};\n`
      })
      style.innerHTML = `:root {\n${innerHTML}}`
      document.head.appendChild(style)
    } else {
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
            document.head.appendChild(style)
          }
        })
      }
    }
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
  // return navigator.language
  return getLocaleLang(appConfig?.localeConfig)
}

async function render(props) {
  const { container } = props;
  if (comlibs && Array.isArray(comlibs)) {
    await insertDeps(comlibs)
    Promise.all(getRtComlibsFromConfigEdit(comlibs).map((t) => requireScript(t))).then(() => {
      const antd = window.antd;
      const lang = getAntdLocalName(getCurrentLocale())

      const antdLocalLib = antd?.locales?.[lang] || (Object.values(antd?.locales || {}))?.find(item => item.locale === getCurrentLocale()) || antd.locale['zh_CN'].default

      reactRoot = ReactDOM.createRoot((container ?? document).querySelector('#root'));

      reactRoot.render(React.createElement(
        antd.ConfigProvider,
        {
          // 如鬼没有就传入undefined使用默认的英文，否则使用指定的语言包，并以中文兜底
          locale: [`en_US`, `en`].includes(lang) ? undefined : antdLocalLib
        },
        renderUI({
          ...props, renderType: 'react', locale: getCurrentLocale(), env: {
            callDomainModel(domainModel, type, params) {
              return callDomainHttp(domainModel, params, { action: type } as any);
            }
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