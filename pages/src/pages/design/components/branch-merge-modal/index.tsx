import React, { useEffect, useMemo, useRef, useState } from 'react'
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
  onConfirm: (dump: any) => Promise<void>
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
  const [sourceData, setSourceData] = useState<DumpJSONInfo | null>(null)
  // diff 结果
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null)

  const {
    loadingBranchInfo,
    fileContent,
    loadingFileContent,
    branchInfo,
    originalFileContent,
    
    getBranchInfoByMainFileId,
    getFileContent
  } = useBranch()

  const currentBranch = useMemo(() => {
    if (sourceBranch && branchInfo?.length) {
      return branchInfo.find(item => item.branchFileId === sourceBranch)
    }
    return null
  }, [sourceBranch, branchInfo])

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
      const sourceData = parseDumpJSON(fileContent)
      setTargetData(currentData)
      setSourceData(sourceData)

      const diffRes = diff(currentData, sourceData)
      setDiffResult(diffRes)
      console.log('Diff Result:', diffRes)
    }
  }, [open, fileContent, designerInstance])

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const obj = JSON.parse(originalFileContent.current)
      const dump = {
        content: obj.content,
        pageConfig: {
          ...obj,
          content: undefined
        }
      }
      await onConfirm(dump)
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
              placeholder="请选择目标分支"
              onChange={(value) => setSourceBranch(value)}
              options={branchInfo?.map((item) => ({
                label: item.branchName,
                value: item.branchFileId
              }))}
            />
          </div>
          {
            sourceBranch && (
              <Spin spinning={loadingFileContent}>
                <div className={css.content}>
                  <div className={css.actions}>
                    <div className={css.left}>
                      <div className={css.item}>
                        <div className={css.colorBlock} style={{ backgroundColor: '#f6ffed', border: '1px solid #b7eb8f' }}></div>
                        新增
                      </div>
                      <div className={css.item}>
                        <div className={css.colorBlock} style={{ backgroundColor: '#e6f7ff', border: '1px solid #91d5ff' }}></div>
                        编辑
                      </div>
                      <div className={css.item}>
                        <div className={css.colorBlock} style={{ backgroundColor: '#fff2f0', border: '1px solid #ffccc7' }}></div>
                        删除
                      </div>
                    </div>
                    <div className={css.right}>
                      {
                        selectCurrentVersion && (
                          <CheckCircleFilled style={{ color: '#52c41a', fontSize: 18 }} />
                        )
                      }
                      <Button type='link' size='small' onClick={() => setSelectCurrentVersion(true)}>选择当前版本</Button>
                    </div>
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
                      <div className={css.branchLabel}>源分支: {currentBranch?.branchName}</div>
                      {sourceData ? (
                        <ComTree data={sourceData} diffRes={diffResult} />
                      ) : (
                        <div className={css.emptyState}>加载目标分支数据...</div>
                      )}
                    </div>
                  </div>
                </div>
              </Spin>
            )
          }
        </div>
      </Spin>
    </Modal>
  )
}
