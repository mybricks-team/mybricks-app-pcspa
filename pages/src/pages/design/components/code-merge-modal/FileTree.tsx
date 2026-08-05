import React, { useState, useMemo, useEffect } from 'react'
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
  expandedKeys?: string[]
  onExpandedKeysChange?: (keys: string[]) => void
}

interface TreeNode extends DataNode {
  isLeaf?: boolean
  fileName?: string
  status?: FileStatus
  statusChar?: string
}

export function FileTree({
  files,
  currentFiles,
  branchFiles,
  mergedFiles,
  selectedFileName,
  onSelect,
  expandedKeys: controlledExpandedKeys,
  onExpandedKeysChange
}: FileTreeProps) {
  const [localExpandedKeys, setLocalExpandedKeys] = useState<string[]>([])
  const expandedKeys = controlledExpandedKeys ?? localExpandedKeys
  const setExpandedKeys = onExpandedKeysChange ?? setLocalExpandedKeys

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

  // 获取文件在最终合并后的源码，用于判断用户是否已处理过该文件
  const getFileMergedSource = (fileName: string): string | undefined => {
    return mergedFiles.get(fileName)
  }

  // 收集所有需要展开的目录key（包含变化的文件的目录）
  const getDefaultExpandedKeys = (nodes: TreeNode[]): string[] => {
    const keys: string[] = []
    const collect = (nodes: TreeNode[], parentKey?: string) => {
      for (const node of nodes) {
        if (node.isLeaf) {
          if (node.status && node.status !== 'unchanged' && parentKey) {
            keys.push(parentKey)
          }
        } else if (node.children) {
          const hasModified = node.children.some(child =>
            (child.isLeaf && child.status && child.status !== 'unchanged') ||
            (child.children && hasModifiedDescendant(child.children))
          )
          if (hasModified) {
            keys.push(node.key as string)
            collect(node.children, node.key as string)
          }
        }
      }
    }
    const hasModifiedDescendant = (nodes: TreeNode[]): boolean => {
      return nodes.some(node =>
        (node.isLeaf && node.status && node.status !== 'unchanged') ||
        (!node.isLeaf && node.children && hasModifiedDescendant(node.children))
      )
    }
    collect(nodes)
    return keys
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
          const isResolved = getFileMergedSource(fullPath) !== undefined
          const statusChar = isResolved ? '' : STATUS_CHAR[status]
          const displayStatus = isResolved ? 'unchanged' : status

          return {
            key: fullPath,
            title: (
              <span className={styles.fileNode}>
                <span className={`${styles.fileName} ${styles[`status-${displayStatus}`]}`}>{key}</span>
                {statusChar && (
                  <span className={`${styles.statusChar} ${styles[`status-${displayStatus}`]}`}>
                    {statusChar}
                  </span>
                )}
              </span>
            ),
            isLeaf: true,
            fileName: fullPath,
            status: displayStatus
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

  // 当treeData变化且没有用户手动展开时，自动展开有变化的目录
  useEffect(() => {
    const defaultExpanded = getDefaultExpandedKeys(treeData)
    setExpandedKeys(defaultExpanded)
  }, [treeData])

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
