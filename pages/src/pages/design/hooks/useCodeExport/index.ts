import { message } from 'antd'
import { useCallback, useState } from 'react'
import {
  exportAiPrd,
  runAiSourceCodeExport,
  type ExportJSON,
} from './exportHelper'

/**
 * AI 源码导出 hook 入参。
 */
type UseAiSourceCodeExportParams = {
  getExportToJSON: () => ExportJSON
  folderName?: string
}

/**
 * AI PRD 导出 hook 入参。
 */
type UseAiPrdExportParams = {
  getExportToJSON: () => ExportJSON
  getPrdTitle?: () => string
  getRuntimeFiles?: (comId: string) => Array<{ fileName: string; content: string }>
}

/**
 * 统一封装 AI 源码导出的 UI 触发逻辑。
 */
export function useAiSourceCodeExport({
  getExportToJSON,
  folderName = 'app',
}: UseAiSourceCodeExportParams) {
  const [loading, setLoading] = useState(false)

  const handleExport = useCallback(async () => {
    if (loading) return

    // 源码导出入口统一走同一个 util。
    setLoading(true)
    try {
      await runAiSourceCodeExport({
        exportJSON: getExportToJSON(),
        folderName,
      })
    } catch (error) {
      console.error('[导出为代码] 导出失败', error)
    } finally {
      setLoading(false)
    }
  }, [folderName, getExportToJSON, loading])

  return {
    loading,
    handleExport,
  }
}

/**
 * 统一封装 AI PRD 导出的 UI 触发逻辑。
 */
export function useAiPrdExport({
  getExportToJSON,
  getPrdTitle,
  getRuntimeFiles,
}: UseAiPrdExportParams) {
  const handleExportPrd = useCallback(async () => {
    if (!getRuntimeFiles) {
      return
    }

    // PRD 导出同样在 hook 内统一处理提示。
    try {
      await exportAiPrd({
        exportJSON: getExportToJSON(),
        fallbackTitle: getPrdTitle?.(),
        getRuntimeFiles,
      })
      message.success('PRD 文档下载成功')
    } catch (error) {
      if (error instanceof Error && error.message === '用户取消导出') {
        return
      }

      console.error('[PRD导出] 导出失败', error)
      message.warn(error instanceof Error ? error.message : 'PRD文档不存在!')
    }
  }, [getExportToJSON, getPrdTitle, getRuntimeFiles])

  return {
    handleExportPrd,
  }
}
