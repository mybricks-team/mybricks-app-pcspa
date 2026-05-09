import { message } from 'antd'
import { useCallback, useState } from 'react'
import { buildVibePreviewHtml } from './buildPreviewHtml'
import {
  getVibePublishSourceList,
} from './getPublishSource'

interface UsePublishPageOptions {
  visible?: boolean
  chatId: number | string
  userId?: string
  target?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vbDesignContext?: any
  getTitle: () => string
}

export function usePublishPage({
  visible,
  chatId,
  userId,
  target,
  vbDesignContext,
  getTitle
}: UsePublishPageOptions) {
  const [downloadHtmlLoading, setDownloadHtmlLoading] = useState(false)

  const handleDownloadHtml = useCallback(async () => {
    setDownloadHtmlLoading(true)
    try {
      // 先调用接口判断内容有效性
      // try {
      //   const contentRes = await getLatestContent(Number(chatId), userId)
      //   const isNoValidContent = !contentRes?.id || !contentRes?.version
      //   if (isNoValidContent) {
      //     message.warning('请先编辑并保存后再下载 HTML')
      //     return
      //   }
      // } catch {
      //   message.warning('无有效内容，请先编辑并保存后再下载')
      //   return
      // }

      // 获取源代码列表

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
      const pageName = source.name || title || '未命名页面'
      const assetOwnerId = String(chatId)
      const finalTitle = pageName

      const htmlContent = await buildVibePreviewHtml({
        title: finalTitle,
        source,
        target,
        chatId,
        userId,
        assetOwnerId,
        vbDesignContext,
        enableVibeProxy: false,
      })

      // 下载为 HTML 文件
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${chatId}-${title}-${finalTitle}.html`
      anchor.click()
      URL.revokeObjectURL(url)
      message.success('HTML 文件下载成功')
    } catch (error) {
      console.error('[usePublishPage] download html error:', error)
      message.error('下载失败，请重试')
    } finally {
      setDownloadHtmlLoading(false)
    }
  }, [userId, chatId, target, vbDesignContext])

  return {
    handleDownloadHtml,
    downloadHtmlLoading,
  }
}
