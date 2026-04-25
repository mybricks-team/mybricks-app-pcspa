import React, { useState } from "react";
import { message, Button } from 'antd'
import { exportCode, isExportSupported } from './export'
import { generateCodeStructure } from './structure-generator';

export type ExportJSON = any

interface CodeExportButtonProps {
  disabled?: boolean
  getExportToJSON: () => ExportJSON
}

/**
 * 获取AI组件数据
 */
function getAiComParams(exportJSON: ExportJSON) {
  const coms = exportJSON?.scenes?.[0]?.coms || {}
  const comId = Object.keys(coms)[0]
  return coms[comId]?.model
}

export default function CodeExportButton({ disabled = false, getExportToJSON, }: CodeExportButtonProps) {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleClick = async () => {
    if (loading) return
    const exportJSON = getExportToJSON()

    const aiComParams = getAiComParams(exportJSON);
    if (!aiComParams?.data) {
      console.error('[导出为代码] 组件数据不存在');
      return;
    }

    if (!isExportSupported()) {
      alert('当前环境不支持导出，请使用 Chrome、Edge 或在 VSCode 中打开');
      return;
    }

    setLoading(true)
    const files = generateCodeStructure(aiComParams.data);
    try {
      await exportCode(files, {
        folderName: 'App',
        onProgress: (progress) => {
          setProgress(progress.progress)
          console.log(`[导出进度] ${progress.progress}% - ${progress.currentFile}`);
        },
      });
      setProgress(0)
      message.success('导出代码成功！')
    } catch (error) {
      console.error('[导出为代码] 导出失败', error);
      const errMsg = error?.toString() || '导出代码失败'
      message.error(errMsg);
    }
    setLoading(false)
  }
  return (
    <Button onClick={handleClick} loading={loading} disabled={disabled}>
      {progress > 0 ? `${progress}%` : '导出'}
    </Button>
  )
}