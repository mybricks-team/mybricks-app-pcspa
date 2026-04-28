import { tramsformJs, tramsformAppLess } from "./codeTransform";
import taroTemplateJson from './taro-template.json'

/**
 * 代码结构生成器
 * 负责将组件数据按照代码结构生成并组织文件
 */
export interface FileItem {
  /** 文件名（包含相对路径，如 runtime.jsx） */
  fileName: string;
  /** 文件内容 */
  content: string;
}

export interface ComponentData {
  files: {
    /** 文件名 */
    fileName: string;
    /** 文件源码（经过 base64 编码） */
    source: string;
  }[]
  themes: {
    themes: {
      id: string;
      name: string;
      vars: {
        propertyName: string;
        value: string;
        title: string;
        type: string;
      }[]
    }[]
  }
}

export function generateCodeStructure(data: ComponentData): FileItem[] {
  const files: Map<string, FileItem> = new Map();
  taroTemplateJson.forEach((file) => {
    files.set(file.fileName, file)
  })

  data.files.forEach((file) => {
    const { fileName, source } = file;
    const filterFiles = ['setup.js', 'scheme.js']
    if (filterFiles.includes(fileName)) {
      return
    }

    let code = decodeURIComponent(source);
    let name = fileName;

    const suffix = fileName.split('.').pop()
    const jsFiles = ['js', 'jsx', 'ts', 'tsx']
    if (jsFiles.includes(suffix)) {
      code = tramsformJs(code)
    } else if (name.endsWith('app.less')) {
      code = tramsformAppLess(code)
    } else if (suffix === 'less') {
      name = name.replace('.less', '.module.less')
    }

    files.set(`src/${name}`, {
      fileName: `src/${name}`,
      content: code
    })
  })

  // files.push(themesFile(data))
  // files.push(entryFile())

  return Array.from(files.values());
}

const themesFile = (data: ComponentData) => {
  const themes = data.themes.themes.reduce((pre, theme) => {
    pre[theme.id] = theme.vars.reduce((pre, cssVar) => {
      pre[cssVar.propertyName] = cssVar.value;
      return pre;
    }, {})
    return pre;
  }, {});

  return {
    fileName: 'themes.js',
    content: `export default ${JSON.stringify(themes, null, 2)}`
  }
}

const entryFile = () => {
  return {
    fileName: 'index.jsx',
    content: `import { ConfigProvider } from '@mybricks/ai-render'
import App from './src'
import themes from './themes'

export default function (props) {
  return (
    <ConfigProvider themes={themes} {...props}>
      <App />
    </ConfigProvider>
  )
}
`
  }
}