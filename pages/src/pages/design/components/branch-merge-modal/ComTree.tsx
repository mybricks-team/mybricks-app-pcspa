import React, { useMemo } from 'react'
import { DumpJSONInfo, Scene } from './parser'
import { DiffResult, DiffItem } from './diff'
import css from './ComTree.less'

interface ComTreeProps {
  data: DumpJSONInfo
  diffRes?: DiffResult
}

export function ComTree({
  data,
  diffRes
}: ComTreeProps) {
  // 创建一个 Map 方便快速查找每个节点的 diff 状态
  const diffMap = useMemo(() => {
    const map = new Map<string, DiffItem<any>>()
    if (diffRes) {
      diffRes.scenes.forEach(item => map.set(item.id, item))
      diffRes.coms.forEach(item => map.set(item.id, item))
      diffRes.modules.forEach(item => map.set(item.id, item))
      diffRes.connectors.forEach(item => map.set(item.id, item))
    }
    return map
  }, [diffRes])

  // 获取节点的 diff 类型
  const getDiffType = (id: string): 'added' | 'removed' | 'modified' | null => {
    const diffItem = diffMap.get(id)
    return diffItem ? diffItem.type : null
  }

  // 渲染树节点
  const renderTreeNode = (node: Scene, level: number = 0): React.ReactNode => {
    const diffType = getDiffType(node.id)
    const hasChildren = node.children && node.children.length > 0

    return (
      <div key={node.id} className={css.treeNode} style={{ paddingLeft: level * 20 }}>
        <div className={`${css.nodeContent} ${diffType ? css[diffType] : ''}`}>
          <div className={css.nodeInfo}>
            {hasChildren && <span className={css.expandIcon}>▼</span>}
            <span className={css.nodeTitle}>{node.title || '未命名'}</span>
            {node.type && <span className={css.nodeType}>{node.type}</span>}
            {diffType && (
              <span className={css.diffBadge}>
                {diffType === 'added' && '新增'}
                {diffType === 'removed' && '删除'}
                {diffType === 'modified' && '修改'}
              </span>
            )}
          </div>
          {node.comDef && (
            <div className={css.comDefInfo}>
              {node.comDef.namespace}@{node.comDef.version}
            </div>
          )}
        </div>
        {hasChildren && (
          <div className={css.children}>
            {node.children!.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  // 渲染连接器
  const renderConnectors = () => {
    if (!data.connectors || data.connectors.length === 0) return null

    return (
      <div className={css.section}>
        <div className={css.sectionTitle}>连接器 ({data.connectors.length})</div>
        {data.connectors.map(connector => {
          const diffType = getDiffType(connector.id)
          return (
            <div
              key={connector.id}
              className={`${css.connectorItem} ${diffType ? css[diffType] : ''}`}
            >
              <div className={css.connectorTitle}>{connector.title}</div>
              <div className={css.connectorMeta}>
                {connector.connectorName} ({connector.type})
              </div>
              {diffType && (
                <span className={css.diffBadge}>
                  {diffType === 'added' && '新增'}
                  {diffType === 'removed' && '删除'}
                  {diffType === 'modified' && '修改'}
                </span>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // 渲染模块
  const renderModules = () => {
    if (!data.modules || data.modules.length === 0) return null

    return (
      <div className={css.section}>
        <div className={css.sectionTitle}>模块 ({data.modules.length})</div>
        {data.modules.map(module => {
          const diffType = getDiffType(module.id)
          return (
            <div
              key={module.id}
              className={`${css.moduleItem} ${diffType ? css[diffType] : ''}`}
            >
              <div className={css.moduleTitle}>{module.title}</div>
              {diffType && (
                <span className={css.diffBadge}>
                  {diffType === 'added' && '新增'}
                  {diffType === 'removed' && '删除'}
                  {diffType === 'modified' && '修改'}
                </span>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={css.comTree}>
      {renderModules()}
      {renderConnectors()}

      {data.scenes && data.scenes.length > 0 && (
        <div className={css.section}>
          <div className={css.sectionTitle}>场景 ({data.scenes.length})</div>
          <div className={css.sceneTree}>
            {data.scenes.map(scene => renderTreeNode(scene, 0))}
          </div>
        </div>
      )}
    </div>
  )
}
