import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { Modal, Button, message, Select } from 'antd'
import { DiffEditor } from '@monaco-editor/react'
import { threeWayMerge } from './mergeAlgorithm'
import { FileMergeState } from './types'
import { FileTree } from './FileTree'
import styles from './index.less'

interface BranchInfo {
  branchFileId: number
  branchName: string
}

interface CodeMergeModalProps {
  open: boolean
  onCancel: () => void
  onConfirm: (mergedFiles: { fileName: string; source: string }[], branchId: number) => Promise<void>
  // 当前版本文件列表
  currentFiles: { fileName: string; source: string }[]
  // 分支列表
  branches: BranchInfo[]
  // 获取分支文件的回调
  onBranchChange: (branchId: number) => Promise<{ fileName: string; source: string }[]>
  // 基准版本文件列表（用于三方合并，如果没有则使用当前版本作为 base）
  baseFiles?: { fileName: string; source: string }[]
}

// 根据文件名后缀推断 Monaco 语言，避免把 .tsx 当成纯 typescript 而报 JSX 语法错误
function getLanguage(fileName: string): string {
  if (fileName.endsWith('.tsx')) return 'typescript'
  if (fileName.endsWith('.ts')) return 'typescript'
  if (fileName.endsWith('.jsx')) return 'javascript'
  if (fileName.endsWith('.js')) return 'javascript'
  if (fileName.endsWith('.json')) return 'json'
  if (fileName.endsWith('.less')) return 'less'
  if (fileName.endsWith('.css')) return 'css'
  if (fileName.endsWith('.md')) return 'markdown'
  if (fileName.endsWith('.html')) return 'html'
  return 'plaintext'
}

const MIN_SIDEBAR_WIDTH = 200
const MAX_SIDEBAR_WIDTH = 600
const DEFAULT_SIDEBAR_WIDTH = 300

export function CodeMergeModal({
  open,
  onCancel,
  onConfirm,
  currentFiles,
  branches,
  onBranchChange,
  baseFiles
}: CodeMergeModalProps) {
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mergedFiles, setMergedFiles] = useState<Map<string, string>>(new Map())
  const [collapsed, setCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH)
  const [resizing, setResizing] = useState(false)
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null)
  const [branchFiles, setBranchFiles] = useState<{ fileName: string; source: string }[]>([])
  const [loadingBranch, setLoadingBranch] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 初始化选择第一个分支
  useEffect(() => {
    if (open && branches.length > 0 && !selectedBranchId) {
      handleBranchChange(branches[0].branchFileId)
    }
  }, [open, branches])

  // 处理分支切换
  const handleBranchChange = async (branchId: number) => {
    setLoadingBranch(true)
    try {
      const files = await onBranchChange(branchId)
      setBranchFiles(files)
      setSelectedBranchId(branchId)
      setMergedFiles(new Map()) // 清空已合并的文件
      setSelectedFileName(null) // 重置选中的文件
    } catch (e) {
      message.error('获取分支文件失败: ' + (e as Error).message)
    } finally {
      setLoadingBranch(false)
    }
  }

  // 计算所有文件的合并状态
  const fileMergeStates: FileMergeState[] = useMemo(() => {
    const states: FileMergeState[] = []
    const fileNames = new Set([
      ...currentFiles.map(f => f.fileName),
      ...branchFiles.map(f => f.fileName)
    ])

    fileNames.forEach(fileName => {
      const current = currentFiles.find(f => f.fileName === fileName)
      const branch = branchFiles.find(f => f.fileName === fileName)
      const base = baseFiles?.find(f => f.fileName === fileName)

      if (!current && branch) {
        // 新增文件
        states.push({
          fileName,
          hasConflict: false,
          mergedSource: branch.source,
          conflicts: []
        })
      } else if (current && !branch) {
        // 删除文件（保留当前）
        states.push({
          fileName,
          hasConflict: false,
          mergedSource: current.source,
          conflicts: []
        })
      } else if (current && branch) {
        // 需要合并
        const baseSource = base?.source || current.source
        const currentSource = current.source
        const branchSource = branch.source
        const baseSourceDecoded = baseSource

        const mergeResult = threeWayMerge(baseSourceDecoded, currentSource, branchSource)

        states.push({
          fileName,
          hasConflict: mergeResult.hasConflict,
          mergedSource: mergeResult.merged,
          conflicts: mergeResult.conflicts
        })
      }
    })
    return states
  }, [currentFiles, branchFiles, baseFiles])

  // 统计各类文件数量
  const stats = useMemo(() => {
    const total = fileMergeStates.length
    const added = fileMergeStates.filter(f => !currentFiles.some(c => c.fileName === f.fileName) && branchFiles.some(b => b.fileName === f.fileName)).length
    const deleted = fileMergeStates.filter(f => currentFiles.some(c => c.fileName === f.fileName) && !branchFiles.some(b => b.fileName === f.fileName)).length
    const modified = fileMergeStates.filter(f => {
      const current = currentFiles.find(c => c.fileName === f.fileName)?.source
      const branch = branchFiles.find(b => b.fileName === f.fileName)?.source
      return current !== undefined && branch !== undefined && current !== branch
    }).length
    return { total, added, deleted, modified }
  }, [fileMergeStates, currentFiles, branchFiles])

  // 默认选中第一个文件（优先选中有冲突的）
  useEffect(() => {
    if (!selectedFileName && fileMergeStates.length > 0) {
      const firstConflict = fileMergeStates.find(f => f.hasConflict)
      setSelectedFileName(firstConflict?.fileName || fileMergeStates[0].fileName)
    }
  }, [fileMergeStates, selectedFileName])

  // 当前选中的文件
  const currentFile = useMemo(
    () => fileMergeStates.find(f => f.fileName === selectedFileName) || null,
    [fileMergeStates, selectedFileName]
  )

  // 用 ref 追踪当前选中的文件名，避免 onMount 闭包持有旧值
  const currentFileNameRef = useRef(selectedFileName)
  useEffect(() => {
    currentFileNameRef.current = selectedFileName
  }, [selectedFileName])

  const handleAcceptCurrent = () => {
    if (!currentFile) return
    const current = currentFiles.find(f => f.fileName === currentFile.fileName)
    if (current) {
      const newMap = new Map(mergedFiles)
      newMap.set(currentFile.fileName, current.source)
      setMergedFiles(newMap)
      message.success('已采用当前版本')
    }
  }

  const handleAcceptIncoming = () => {
    if (!currentFile) return
    const branch = branchFiles.find(f => f.fileName === currentFile.fileName)
    if (branch) {
      const newMap = new Map(mergedFiles)
      newMap.set(currentFile.fileName, branch.source)
      setMergedFiles(newMap)
      message.success('已采用分支版本')
    }
  }

  const handleConfirm = async () => {
    if (!selectedBranchId) {
      message.error('请选择分支')
      return
    }
    setLoading(true)
    try {
      const result = fileMergeStates.map(state => ({
        fileName: state.fileName,
        source: encodeURIComponent(mergedFiles.get(state.fileName) || state.mergedSource)
      }))
      console.log(result)
      await onConfirm(result, selectedBranchId)
      message.success('合并成功')
    } catch (e) {
      message.error('合并失败: ' + (e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // 拖动调整侧边栏宽度
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setResizing(true)

    const startX = e.clientX
    const startWidth = sidebarWidth

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX
      const newWidth = Math.min(
        MAX_SIDEBAR_WIDTH,
        Math.max(MIN_SIDEBAR_WIDTH, startWidth + delta)
      )
      setSidebarWidth(newWidth)
    }

    const handleMouseUp = () => {
      setResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [sidebarWidth])

  const hasUnresolvedConflicts = fileMergeStates.some(f => f.hasConflict && !mergedFiles.has(f.fileName))

  // DiffEditor 的 modified 内容
  const modifiedValue = currentFile
    ? (mergedFiles.get(currentFile.fileName) ?? currentFile.mergedSource)
    : ''

  // original 内容（当前版本）
  const originalValue = currentFile
    ? currentFiles.find(f => f.fileName === currentFile.fileName)?.source || ''
    : ''

  return (
    <Modal
      title={
        <div className={styles.modalTitle}>
          <span>代码合并</span>
          <div className={styles.branchSelector}>
            <span className={styles.branchLabel}>合并分支：</span>
            <Select
              size="small"
              style={{ minWidth: 200 }}
              value={selectedBranchId ?? undefined}
              loading={loadingBranch}
              placeholder="请选择分支"
              onChange={handleBranchChange}
              options={branches.map(b => ({
                label: b.branchName,
                value: b.branchFileId
              }))}
            />
          </div>
        </div>
      }
      visible={open}
      onCancel={onCancel}
      width="90vw"
      style={{ top: 20 }}
      bodyStyle={{ height: 'calc(90vh - 110px)', padding: 0 }}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          disabled={hasUnresolvedConflicts || !selectedBranchId}
          onClick={handleConfirm}
        >
          确认合并
        </Button>
      ]}
    >
      <div className={styles.container} ref={containerRef}>
        <div
          className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}
          style={{ width: collapsed ? 0 : sidebarWidth }}
        >
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>文件列表</span>
            <span
              className={styles.collapseBtn}
              onClick={() => setCollapsed(true)}
              title="收起"
            >
              «
            </span>
          </div>
          <div className={styles.sidebarContent}>
            <div className={styles.fileTreeWrapper}>
              <FileTree
                files={fileMergeStates}
                currentFiles={currentFiles}
                branchFiles={branchFiles}
                mergedFiles={mergedFiles}
                selectedFileName={selectedFileName}
                onSelect={setSelectedFileName}
              />
            </div>
            <div className={styles.fileStats}>
              <span className={styles.statItem}>待处理：{stats.modified}</span>
              <span className={styles.statItem}>新增：{stats.added}</span>
              <span className={styles.statItem}>删除：{stats.deleted}</span>
              <span className={styles.statItem}>共：{stats.total}</span>
            </div>
            {currentFile && currentFile.hasConflict && (
              <div className={styles.actions}>
                <Button size="small" onClick={handleAcceptCurrent} block>
                  采用当前版本
                </Button>
                <Button
                  size="small"
                  onClick={handleAcceptIncoming}
                  block
                  style={{ marginTop: 8 }}
                >
                  采用分支版本
                </Button>
              </div>
            )}
            {currentFile && currentFile.conflicts.length > 0 && (
              <div className={styles.conflictList}>
                <div className={styles.conflictTitle}>
                  冲突列表 ({currentFile.conflicts.length})
                </div>
                {currentFile.conflicts.map((conflict, idx) => (
                  <div key={idx} className={styles.conflictItem}>
                    第 {conflict.startLine}-{conflict.endLine} 行
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {!collapsed && (
          <div
            className={`${styles.resizer} ${resizing ? styles.resizing : ''}`}
            onMouseDown={handleResizeStart}
          />
        )}

        {collapsed && (
          <div
            className={styles.expandBtn}
            onClick={() => setCollapsed(false)}
            title="展开"
          >
            »
          </div>
        )}

        <div className={styles.editor}>
          {currentFile ? (
            <DiffEditor
              key={currentFile.fileName}
              height="100%"
              theme='light'
              language={getLanguage(currentFile.fileName)}
              original={originalValue}
              modified={modifiedValue}
              options={{
                readOnly: false,
                renderSideBySide: true,
                originalEditable: false,
                automaticLayout: true
              }}
              onMount={(editor) => {
                const modifiedEditor = editor.getModifiedEditor()
                const disposable = modifiedEditor.onDidChangeModelContent(() => {
                  const fileName = currentFileNameRef.current
                  if (!fileName) return
                  const value = modifiedEditor.getValue()
                  setMergedFiles(prev => {
                    if (prev.get(fileName) === value) return prev
                    const newMap = new Map(prev)
                    newMap.set(fileName, value)
                    return newMap
                  })
                })
                // 组件卸载或重渲染时清理旧监听
                return () => disposable.dispose()
              }}
              beforeMount={(monaco) => {
                // ✅ 1. 正确开启 TSX
                monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
                  jsx: monaco.languages.typescript.JsxEmit.ReactJSX, // ⚠️ 用这个，不要用 React
                  allowNonTsExtensions: true,
                  target: monaco.languages.typescript.ScriptTarget.ESNext,
                  moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
                  esModuleInterop: true,
                  allowJs: true,
                });

                // ✅ 2. 注入 React 类型（关键！！！）
                monaco.languages.typescript.typescriptDefaults.addExtraLib(
                  `
                    declare module 'react' {
                      export = React;
                    }
                    declare namespace React {
                      interface FC<P = {}> {
                        (props: P): any;
                      }
                    }
                    `,
                  'file:///node_modules/@types/react/index.d.ts'
                );

                // ✅ 3. 允许 JSX
                monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
                  noSemanticValidation: false,
                  noSyntaxValidation: false,
                });
              }}
            />
          ) : (
            <div className={styles.emptyState}>请选择文件</div>
          )}
        </div>
      </div>
    </Modal>
  )
}
