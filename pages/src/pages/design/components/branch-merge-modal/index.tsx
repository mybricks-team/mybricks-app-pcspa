import React, { useEffect, useRef, useState } from 'react'
import { Button, Modal, Select, Spin } from 'antd'
import { SwapLeftOutlined, CheckCircleFilled } from '@ant-design/icons'
import { ComTree } from './ComTree'
import { parseDumpJSON, DumpJSONInfo } from './parser'
import { diff, DiffResult } from './diff'
import { useBranch } from '../../hooks/useBranch'
import css from './index.less'

interface BranchMergeModalProps {
  open: boolean
  fileId?: number
  designerInstance?: any
  onCancel: () => void
  onConfirm: (dump: string) => Promise<void>
}

export function BranchMergeModal({
  open,
  designerInstance,
  fileId,

  onCancel,
  onConfirm
}: BranchMergeModalProps) {
  const [sourceBranch, setSourceBranch] = useState()
  const [selectCurrentVersion, setSelectCurrentVersion] = useState(false)
  const [loading, setLoading] = useState(false)
  // 当前分支（目标分支）的数据
  const [targetData, setTargetData] = useState<DumpJSONInfo | null>(null)
  // diff 结果
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null)

  const {
    loadingBranchInfo,
    fileContent,
    loadingFileContent,
    branchInfo,
    getBranchInfoByMainFileId,
    getFileContent
  } = useBranch()

  useEffect(() => {
    if (fileId && open) {
      getBranchInfoByMainFileId(fileId)
    }
  }, [fileId, open])

  useEffect(() => {
    if (sourceBranch) {
      getFileContent(sourceBranch)
    }
  }, [sourceBranch])

  useEffect(() => {
    if (open && fileContent) {
      // 获取当前分支（main）的数据
      const dumpJSON = designerInstance.dump()
      const currentData = parseDumpJSON(dumpJSON)
      setTargetData(currentData)

      const diffRes = diff(fileContent, currentData)
      setDiffResult(diffRes)
      console.log('Diff Result:', diffRes)
    }
  }, [open, fileContent, designerInstance])

  const handleConfirm = () => {
    setLoading(true)
    try {
      onConfirm(JSON.stringify(fileContent))
    } catch (e) {
      console.error('save error', e)
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
      <Spin spinning={loadingBranchInfo}>
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
              options={branchInfo?.map((item) => ({
                label: item.branch_name,
                value: item.branch_file_id
              }))}
            />
          </div>
          <Spin spinning={loadingFileContent}>
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
                  {fileContent ? (
                    <ComTree data={fileContent} diffRes={diffResult} />
                  ) : (
                    <div className={css.emptyState}>加载目标分支数据...</div>
                  )}
                </div>
              </div>
            </div>
          </Spin>
        </div>
      </Spin>
    </Modal>
  )
}
