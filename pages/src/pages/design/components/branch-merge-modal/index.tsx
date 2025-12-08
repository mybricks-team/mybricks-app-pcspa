import React, { useEffect, useRef, useState } from 'react'
import { Button, Modal, Select } from 'antd'
import { SwapLeftOutlined, CheckCircleFilled } from '@ant-design/icons'
import { ComTree } from './ComTree'
import { parseDumpJSON, DumpJSONInfo } from './parser'
import { diff, DiffResult } from './diff'
import css from './index.less'

interface BranchMergeModalProps {
  open: boolean
  designerInstance?: any
  onCancel: () => void
  onConfirm: (dump: string) => Promise<void>
}

export function BranchMergeModal({
  open,
  designerInstance,

  onCancel,
  onConfirm
}: BranchMergeModalProps) {
  const [sourceBranch, setSourceBranch] = useState('dev')
  const [selectCurrentVersion, setSelectCurrentVersion] = useState(false)
  const [loading, setLoading] = useState(false)
  const sourceDump = useRef()

  // 当前分支（目标分支）的数据
  const [targetData, setTargetData] = useState<DumpJSONInfo | null>(null)
  // 源分支的数据
  const [sourceData, setSourceData] = useState<DumpJSONInfo | null>(null)
  // diff 结果
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null)

  useEffect(() => {
    if (open) {
      // 获取当前分支（main）的数据
      const dumpJSON = designerInstance.dump()
      const currentData = parseDumpJSON(dumpJSON)
      setTargetData(currentData)

      // TODO: 获取源分支的数据
      // 这里需要从服务端或其他地方获取源分支的数据
      // 暂时使用模拟数据进行演示
      fetchSourceBranchData(sourceBranch).then(data => {
        setSourceData(data)

        // 计算 diff
        if (data) {
          const diffRes = diff(data, currentData)
          setDiffResult(diffRes)
          console.log('Diff Result:', diffRes)
        }
      })
    }
  }, [open, sourceBranch, designerInstance])

  // 获取源分支数据（需要根据实际情况实现）
  const fetchSourceBranchData = async (branch: string): Promise<DumpJSONInfo | null> => {
    // TODO: 实现从服务端获取指定分支的数据
    // 这里返回 null 或模拟数据
    console.log('Fetching data for branch:', branch)
    const dumpJSON = designerInstance.dump()
    const currentData = parseDumpJSON(dumpJSON)
    currentData.coms[0].data = { a: 1 }
    // 临时返回当前数据作为示例
    // 实际应该从服务端 API 获取
    return currentData
  }

  const handleConfirm = () => {
    setLoading(true)
    try {
      onConfirm(sourceDump.current)
    } catch (e) {
      console.error('save error': e)
    }
    setLoading(false)
  }

  return (
    <Modal
      title="分支合并"
      width="80%"
      visible={open}
      cancelText="取消"
      okText="合并"
      okButtonProps={{
        disabled: !selectCurrentVersion,
        loading
      }}
      onCancel={onCancel}
      onOk={handleConfirm}
    >
      <div className={css.myBranchMergeContainer}>
        <div className={css.top}>
          <Select
            style={{ width: 200 }}
            value='main'
            disabled
            options={[
              {
                label: '主分支',
                value: 'main'
              }
            ]}
          />
          <SwapLeftOutlined className={css.icon} />
          <Select
            style={{ width: 200 }}
            value={sourceBranch}
            onChange={(value) => setSourceBranch(value)}
            options={[
              {
                label: '开发',
                value: 'dev'
              },
              {
                label: '日常',
                value: 'daily'
              }
            ]}
          />
        </div>
        <div className={css.content}>
          <div className={css.actions}>
            {
              selectCurrentVersion && (
                <CheckCircleFilled style={{ color: '#52c41a', fontSize: 18 }} />
              )
            }
            <Button type='link' size='small' onClick={() => setSelectCurrentVersion(true)}>选择当前版本</Button>
          </div>
          <div className={css.comInfo}>
            <div className={css.left}>
              <div className={css.branchLabel}>当前分支: main</div>
              {targetData ? (
                <ComTree data={targetData} diffRes={diffResult} />
              ) : (
                <div className={css.emptyState}>加载当前分支数据...</div>
              )}
            </div>
            <div className={css.right}>
              <div className={css.branchLabel}>源分支: dev</div>
              {sourceData ? (
                <ComTree data={sourceData} diffRes={diffResult} />
              ) : (
                <div className={css.emptyState}>加载目标分支数据...</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
