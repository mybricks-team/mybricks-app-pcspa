import exportTemplateJson from './exportTemplate.json'

/**
 * 代码结构生成器
 * 负责将组件数据按照代码结构生成并组织文件
 */
export interface FileItem {
  /** 文件名（包含相对路径，如 runtime.jsx） */
  fileName: string;
  /** 文件内容 */
  content: string | Blob;
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

/**
 * 安全解码 AI 产出的源码内容。
 */
function safeDecode(value = '') {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * 按模板结构组装导出文件。
 */
export function generateCodeStructure(data: ComponentData): FileItem[] {
  const files: Map<string, FileItem> = new Map();
  exportTemplateJson.forEach((file) => {
    files.set(file.fileName, file)
  })

  data.files.forEach((file) => {
    const { fileName, source } = file;
    const filterFiles = ['setup.ts', 'scheme.ts', 'requirement.md']
    if (filterFiles.includes(fileName)) {
      return
    }

    const code = safeDecode(source);
    const suffix = fileName.split('.').pop()
    let outputFileName = fileName

    if (suffix === 'less' &&
      fileName !== 'app.less' &&
      !fileName.endsWith('.module.less')) {
      outputFileName = fileName.replace('.less', '.module.less')
    }

    if (fileName === 'index.tsx') {
      outputFileName = 'App.tsx'
    }

    const outputPath = `src/${outputFileName}`

    files.set(outputPath, {
      fileName: outputPath,
      content: code
    })
  })

  // files.push(themesFile(data))
  // files.push(entryFile())

  return Array.from(files.values());
}

/**
 * 生成主题变量文件。
 */
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

/**
 * 生成导出入口文件。
 */
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
