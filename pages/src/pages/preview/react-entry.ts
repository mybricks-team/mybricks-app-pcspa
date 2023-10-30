import { PC_NORMAL_COM_LIB, CHARS_COM_LIB, BASIC_COM_LIB } from '@/constants'
import { getQueryString, requireScript } from '@/utils'
import { PreviewStorage } from '@/utils/previewStorage'
import { call as callDomainHttp } from '@mybricks/plugin-connector-domain';
import renderUI from './renderUI'
import '@/reset.less'

const React = window.React;
const ReactDOM = window.ReactDOM;
const antd = window.antd;

const fileId = getQueryString('fileId')
const previewStorage = new PreviewStorage({ fileId })

let { dumpJson, comlibs } = previewStorage.getPreviewPageData()

if (!dumpJson) {
    throw new Error('数据错误：项目数据缺失')
}

if (!comlibs) {
    console.warn('数据错误: 组件库缺失')
    comlibs = [PC_NORMAL_COM_LIB.rtJs, CHARS_COM_LIB.rtJs, BASIC_COM_LIB.rtJs]
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

function render(props) {
    const { container } = props;
    if (comlibs && Array.isArray(comlibs)) {
        Promise.all(comlibs.map((t) => requireScript(t))).then(() => {
            // ReactDOM.render(
            //     React.createElement(
            //         antd.ConfigProvider,
            //         {
            //             locale: antd.locale['zh_CN'].default,
            //         },
            //         renderUI({
            //             ...props, renderType: 'react', env: {
            //                 callDomainModel(domainModel, type, params) {
            //                     return callDomainHttp(domainModel, params, { action: type } as any);
            //                 }
            //             }
            //         })
            //     ),
            //     (container ?? document).querySelector('#root')
            // )

            reactRoot = ReactDOM.createRoot((container ?? document).querySelector('#root'));

            reactRoot.render(React.createElement(
                antd.ConfigProvider,
                {
                    locale: antd.locale['zh_CN'].default,
                },
                renderUI({
                    ...props, renderType: 'react', env: {
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