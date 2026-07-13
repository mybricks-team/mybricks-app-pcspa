import { message } from 'antd'
import { useCallback, useState } from 'react'
import { buildVibePreviewHtml, buildVibePreviewZip } from './buildPreviewHtml'
import {
  getVibePublishSourceList,
} from './getPublishSource'
import axios from 'axios'

interface UsePublishPageOptions {
  chatId: number | string
  vbDesignContext?: any
  getTitle: () => string
  ctx: any
}

export function usePublishPage({
  chatId,
  vbDesignContext,
  getTitle,
  ctx
}: UsePublishPageOptions) {
  const [downloadHtmlLoading, setDownloadHtmlLoading] = useState(false)

  const handleDownloadHtml = useCallback(async () => {
    setDownloadHtmlLoading(true)
    try {
      let sourceList: Awaited<ReturnType<typeof getVibePublishSourceList>>
      try {
        sourceList = await getVibePublishSourceList()
        if (!sourceList.length) {
          message.warning('源代码为空，暂无可下载的内容')
          return
        }
      } catch {
        message.warning('获取源代码失败，源代码为空')
        return
      }

      const source = sourceList[0]
      const title = getTitle()
      const pageName = title || '未命名页面'
      const assetOwnerId = String(chatId)
      const finalTitle = pageName

      const zipBlob = await buildVibePreviewZip({
        title: finalTitle,
        source,
        chatId,
        assetOwnerId,
        vbDesignContext,
      })

      // 下载为 ZIP 文件（包含 index.html + 所有本地资源）
      const url = URL.createObjectURL(zipBlob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${chatId}-${finalTitle}.zip`
      anchor.click()
      URL.revokeObjectURL(url)
      message.success('ZIP 文件下载成功')
    } catch (error) {
      console.error('[usePublishPage] download zip error:', error)
      message.error('下载失败，请重试')
    } finally {
      setDownloadHtmlLoading(false)
    }
  }, [chatId, vbDesignContext])

  const [publishLoading, setPublishLoading] = useState(false)

  const handlePublish = useCallback(async ({ next }) => {
    setPublishLoading(true)
    try {
      let sourceList: Awaited<ReturnType<typeof getVibePublishSourceList>>
      try {
        sourceList = await getVibePublishSourceList()
        if (!sourceList.length) {
          message.warning('源代码为空，暂无可发布的内容')
          return
        }
      } catch {
        message.warning('获取源代码失败，源代码为空')
        return
      }

      const source = sourceList[0]
      const title = getTitle()
      const pageName = title || '未命名页面'
      const assetOwnerId = String(chatId)
      const finalTitle = pageName

      const htmlContent = await buildVibePreviewHtml({
        title: finalTitle,
        source,
        chatId,
        assetOwnerId,
        vbDesignContext,
        enableVibeProxy: false,
        userId: ctx.user?.id,
      })

      const publishRes = await axios.post('/api/pcpage/vibepublish', {
        userId: ctx.user?.id,
        fileId: ctx.fileId,
        html: htmlContent
      })
      next(publishRes.data.data.url)
      message.success('发布成功')
    } catch (error) {
      console.error('[usePublishPage] publish error:', error)
      message.error('发布失败，请重试')
    } finally {
      setPublishLoading(false)
    }
  }, [chatId, vbDesignContext])

  return {
    handleDownloadHtml,
    downloadHtmlLoading,
    handlePublish,
    publishLoading
  }
}
