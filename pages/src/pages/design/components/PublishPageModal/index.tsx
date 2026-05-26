import {
  Alert,
  Button,
  Input,
  Modal,
  Radio,
  Spin,
  Tooltip,
  message,
} from 'antd'
import React, { useEffect, useMemo, useState } from 'react'
import { usePublishPage } from '../../hooks/usePublishPage'
import style from './index.less'
import axios from 'axios'
import { copyText } from '@/utils'

interface PublishPageModalProps {
  visible: boolean
  onCancel: () => void
  fileId: number
  getTitle: () => string
  ctx: any
}

const PublishPageModal: React.FC<PublishPageModalProps> = ({
  visible,
  onCancel,
  getTitle,
  fileId,
  ctx,
}) => {
  const [title, setTitle] = useState(getTitle())
  const [initLoading, setInitLoading] = useState(false)
  const [publishUrl, setPublishUrl] = useState(null)

  useEffect(() => {
    if (visible) {
      setTitle(getTitle())
      if (!publishUrl) {
        axios.get(
          `/api/pcpage/getVibePublishUrl/${fileId}`
        ).then((res) => {
          console.log(res)
          const data = res.data.data;
          if (data && data.url) {
            setPublishUrl(`${data.url}?env=mock`)
          }
        }).catch((e) => {
          console.error(e)
        }).finally(() => {
          setInitLoading(false)
        })
      }
    }
  }, [visible])

  const { handlePublish, publishLoading } = usePublishPage({
    vbDesignContext: {},
    chatId: fileId,
    getTitle,
    ctx
  })

  const renderPublishButton = ({ block = false }: { block?: boolean }) => (
    <Button
      type="primary"
      size={block ? 'large' : undefined}
      style={{
        color: 'white',
      }}
      loading={publishLoading}
      onClick={() => {
        handlePublish({
          next: (url) => {
            setPublishUrl(`${url}?env=mock`)
          }
        })
      }}
      block={block}
      className={block ? style.publishBtn : style.republishBtn}
    >
      发布
    </Button>
  )


  const onCopy = async (url: string) => {
    if (!url) return
    copyText(url)
    message.success('链接已复制到剪贴板')
  }

  return (
    <Modal
      title="发布"
      visible={visible}
      onCancel={onCancel}
      footer={null}
      width={480}
      className={style.modal}
      centered
    >
      <Spin spinning={initLoading}>
        <div className={style.container}>
          <div className={style.section}>
            <div className={style.label}>页面标题</div>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="请输入页面标题"
              maxLength={50}
              showCount
            />
          </div>

          {publishUrl ? (
            <div className={style.section}>
              <div className={style.label}>发布链接</div>
              <div className={style.urlRow}>
                <Input value={publishUrl} readOnly />
                <div className={style.urlActions}>
                  <Button
                    onClick={() => {
                      onCopy(publishUrl)
                    }}
                    className={style.copyBtn}
                  >
                    复制
                  </Button>
                  {renderPublishButton({})}
                </div>
              </div>
            </div>
          ) : renderPublishButton({})}
        </div>
      </Spin>
    </Modal>
  )
}

export default PublishPageModal
