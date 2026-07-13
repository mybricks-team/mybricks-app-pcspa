import { message } from 'antd'
import { CodeTransformer } from '@/utils/codeTransformer'
import { exportCode, exportMd, type ExportProgress } from './exportGenerator'
import {
  generateCodeStructure,
  type ComponentData,
  type FileItem,
} from './structureGenerator'

// 这里只保留导出核心能力，供不同 UI 入口复用。
export type ExportJSON = any

type RuntimeFile = {
  fileName: string
  content: string
}

export type AiExportContext = {
  comId: string
  model: any
  data: ComponentData
}

export type ExportAiSourceCodeParams = {
  exportJSON: ExportJSON
  folderName?: string
  onProgress?: (progress: ExportProgress) => void
}

export type ExportAiPrdParams = {
  exportJSON: ExportJSON
  fallbackTitle?: string
  getRuntimeFiles: (comId: string) => RuntimeFile[]
}

/**
 * 从设计器导出 JSON 中提取首个 AI 组件的导出上下文。
 */
export function getAiExportContext(exportJSON: ExportJSON): AiExportContext | null {
  const coms = exportJSON?.scenes?.[0]?.coms || {}
  const comId = Object.keys(coms)[0]

  if (!comId) {
    return null
  }

  const model = coms[comId]?.model
  const data = model?.data

  if (!data) {
    return null
  }

  return {
    comId,
    model,
    data,
  }
}

type TransformableCodeFile = {
  path: string
  content: string
}

/**
 * 提取可参与 Babel 转换的文本源码文件。
 */
function getTransformableCodeFiles(files: FileItem[]): TransformableCodeFile[] {
  return files.flatMap((file) => {
    if (typeof file.content !== 'string') {
      return []
    }

    return [{
      path: file.fileName,
      content: file.content,
    }]
  })
}

/**
 * 将 Babel 转换后的源码内容合并回导出文件列表。
 */
function mergeTransformedCodeFiles(
  files: FileItem[],
  transformedFiles: TransformableCodeFile[],
): FileItem[] {
  const transformedMap = new Map(
    transformedFiles.map((file) => [file.path, file.content]),
  )

  return files.map((file) => {
    if (typeof file.content !== 'string') {
      return file
    }

    const transformedContent = transformedMap.get(file.fileName)
    if (typeof transformedContent === 'undefined') {
      return file
    }

    return {
      ...file,
      content: transformedContent,
    }
  })
}

/**
 * 对结构化后的代码文件统一补做 Babel 转换。
 */
export function transformGeneratedCodeFiles(files: FileItem[]): FileItem[] {
  // 结构生成之后统一补一层 Babel 转换，避免入口各自处理。
  const transformer = new CodeTransformer()
  const codeFiles = getTransformableCodeFiles(files)
  const transformedFiles = transformer.transformFiles(codeFiles)

  return mergeTransformedCodeFiles(files, transformedFiles)
}

/**
 * 生成最终可导出的文件列表。
 */
export async function generateAiExportFiles(data: ComponentData): Promise<FileItem[]> {
  const files = generateCodeStructure(data)
  const transformedFiles = transformGeneratedCodeFiles(files)
  return transformedFiles
}

/**
 * 执行源码导出核心流程，不处理 UI 提示。
 */
export async function exportAiSourceCode({
  exportJSON,
  folderName = 'app',
  onProgress,
}: ExportAiSourceCodeParams) {
  const context = getAiExportContext(exportJSON)

  if (!context?.data?.files?.length) {
    throw new Error('源代码为空，暂无可下载的内容!')
  }

  const files = await generateAiExportFiles(context.data)
  await exportCode(files, {
    folderName,
    onProgress,
  })
}

/**
 * 执行源码导出并统一处理提示与进度反馈。
 */
export async function runAiSourceCodeExport({
  exportJSON,
  folderName = 'app',
}: Omit<ExportAiSourceCodeParams, 'onProgress'>) {
  // 统一处理源码导出的提示文案与进度反馈。
  const messageKey = 'export-source-code'

  message.open({
    key: messageKey,
    type: 'loading',
    content: '正在导出源代码...',
    duration: 0,
  })

  try {
    await exportAiSourceCode({
      exportJSON,
      folderName,
      onProgress: (progress) => {
        message.open({
          key: messageKey,
          type: 'loading',
          content: `正在导出源代码 (${progress.completedFiles}/${progress.totalFiles})...`,
          duration: 0,
        })
      },
    })
    message.open({
      key: messageKey,
      type: 'success',
      content: '源代码下载成功！',
      duration: 2,
    })
  } catch (error) {
    if (error instanceof Error && error.message === '用户取消导出') {
      message.destroy(messageKey)
      return
    }

    message.open({
      key: messageKey,
      type: 'error',
      content: error instanceof Error ? error.message : '源代码导出失败',
      duration: 2,
    })
    throw error
  }
}

/**
 * 从 PRD 内容中提取下载标题。
 */
function getPrdTitle(content: string, fallbackTitle?: string) {
  const titleMatch = content.match(/^---[\s\S]*?^title:\s*(.+?)$/m)
  return titleMatch ? titleMatch[1].trim() : fallbackTitle || 'PRD文档'
}

/**
 * 导出 AI 运行态中的 PRD 文档。
 */
export function exportAiPrd({
  exportJSON,
  fallbackTitle,
  getRuntimeFiles,
}: ExportAiPrdParams) {
  const context = getAiExportContext(exportJSON)

  if (!context?.comId) {
    throw new Error('PRD文档不存在!')
  }

  const files = getRuntimeFiles(context.comId) || []
  const prdFile = files.find((item) => item.fileName === 'requirement.md')

  if (!prdFile?.content) {
    throw new Error('PRD文档不存在!')
  }

  const prdTitle = getPrdTitle(prdFile.content, fallbackTitle)
  return exportMd(prdFile.content, {
    fileName: `${prdTitle}-PRD文档.md`,
    mimeType: 'text/markdown;charset=utf-8',
    folderName: 'app',
  })
}
