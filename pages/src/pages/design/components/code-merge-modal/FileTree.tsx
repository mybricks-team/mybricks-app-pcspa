import React, { useState, useMemo } from 'react'
import { Tree } from 'antd'
import type { TreeProps, DataNode } from 'antd/es/tree'
import { FileMergeState } from './types'
import styles from './FileTree.less'

export type FileStatus = 'added' | 'deleted' | 'modified' | 'unchanged'

// 状态对应的字符标记
const STATUS_CHAR: Record<FileStatus, string> = {
  added: 'U',
  deleted: 'D',
  modified: 'M',
  unchanged: ''
}

interface FileTreeProps {
  files: FileMergeState[]
  currentFiles: { fileName: string; source: string }[]
  branchFiles: { fileName: string; source: string }[]
  mergedFiles: Map<string, string>
  selectedFileName: string | null
  onSelect: (fileName: string) => void
}

interface TreeNode extends DataNode {
  isLeaf?: boolean
  fileName?: string
  status?: FileStatus
}

export function FileTree({
  files,
  currentFiles,
  branchFiles,
  mergedFiles,
  selectedFileName,
  onSelect
}: FileTreeProps) {
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])

  // 计算文件状态
  const getFileStatus = (file: FileMergeState): FileStatus => {
    const inCurrent = currentFiles.some(f => f.fileName === file.fileName)
    const inBranch = branchFiles.some(f => f.fileName === file.fileName)
    const currentSource = currentFiles.find(f => f.fileName === file.fileName)?.source
    const branchSource = branchFiles.find(f => f.fileName === file.fileName)?.source

    if (!inCurrent && inBranch) return 'added'
    if (inCurrent && !inBranch) return 'deleted'
    if (inCurrent && inBranch && currentSource !== branchSource) return 'modified'
    return 'unchanged'
  }

  // 构建树形结构
  const treeData = useMemo(() => {
    const root: Record<string, any> = {}

    files.forEach(file => {
      const parts = file.fileName.split('/')
      let current = root

      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = index === parts.length - 1 ? null : {}
        }
        if (index < parts.length - 1) {
          current = current[part]
        }
      })
    })

    const buildTree = (node: Record<string, any> | null, path: string = ''): TreeNode[] => {
      if (node === null) return []

      return Object.keys(node).map(key => {
        const fullPath = path ? `${path}/${key}` : key
        const children = node[key]

        if (children === null) {
          // 叶子节点（文件）
          const file = files.find(f => f.fileName === fullPath)!
          const status = getFileStatus(file)
          const statusChar = STATUS_CHAR[status]

          return {
            key: fullPath,
            title: (
              <span className={styles.fileNode}>
                <span className={`${styles.fileName} ${styles[`status-${status}`]}`}>{key}</span>
                {statusChar && (
                  <span className={`${styles.statusChar} ${styles[`status-${status}`]}`}>
                    {statusChar}
                  </span>
                )}
              </span>
            ),
            isLeaf: true,
            fileName: fullPath,
            status
          }
        } else {
          // 目录节点
          const childNodes = buildTree(children, fullPath)

          return {
            key: fullPath,
            title: (
              <span className={styles.folderNode}>
                <span className={styles.folderIcon}>📁</span>
                <span className={styles.folderName}>{key}</span>
              </span>
            ),
            children: childNodes,
            isLeaf: false
          }
        }
      })
    }

    return buildTree(root)
  }, [files, currentFiles, branchFiles, mergedFiles])

  const handleSelect: TreeProps['onSelect'] = (selectedKeys, info) => {
    const node = info.node as TreeNode
    if (node.isLeaf && node.fileName) {
      onSelect(node.fileName)
    }
  }

  const handleExpand: TreeProps['onExpand'] = (keys) => {
    setExpandedKeys(keys as string[])
  }

  return (
    <div className={styles.fileTree}>
      <Tree
        showIcon={false}
        showLine={false}
        treeData={treeData}
        expandedKeys={expandedKeys}
        selectedKeys={selectedFileName ? [selectedFileName] : []}
        onSelect={handleSelect}
        onExpand={handleExpand}
        className={styles.tree}
      />
    </div>
  )
}
