import { requestJson } from './request'

export const API_DOC_TOOL_NAME = 'get-api-doc'
const API_DOC_URL = '/v1/api-schemes/mock'
const FILE_WHITELIST = ['dataSource.js', 'datasourceScheme.js', 'setup.js', 'requirement.md', 'README.md']
const DEFAULT_BASE_URL = "http://localhost:3000";

type ApiDocItem = {
  id: string
  cnName: string
  name: string
  baseUrl: string
  method: string
  path: string
  response?: any
}


/**
 *  将后端接口文档响应转换为 ApiDocItem 数组
 * @param payload 
 * @returns 
 */
function normalizeApiDocResponse(payload: any): ApiDocItem[] {
  return payload?.data ?? []
}

/**
 * 获取白名单内文件的内容，供接口文档生成使用
 * @param toolContext 
 * @returns 
 */
async function getWhitelistedFileContent(toolContext: any) {
  const agent = toolContext.getAgent?.()
  const sandbox = agent?.options?.sandbox
  const files = await sandbox?.getFiles?.()

  return FILE_WHITELIST.map((path) => {
    const matchedFile = Array.isArray(files)
      ? files.find((file: any) => file?.path === path)
      : null

    return {
      path,
      content: matchedFile?.content ?? '',
    }
  })
}

/**
 *  根据接口文档生成简要总结，供用户查看
 * @param apiDocs 
 * @returns 
 */
function summarizeApiDocs(apiDocs: ApiDocItem[]) {
  if (!Array.isArray(apiDocs) || apiDocs.length === 0) {
    return '未获取到接口文档。'
  }

  return [
    '已获取接口文档，可用于后续 dataSource.js 和 setup.js 的生成：',
    ...apiDocs.map((item, index) => {
      const responseKeys = item.response && typeof item.response === 'object'
        ? Object.keys(item.response).join(', ')
        : '无'

      return [
        `${index + 1}. ${item.cnName || item.name}`,
        `- id: ${item.id}`,
        `- name: ${item.name}`,
        `- method: ${item.method}`,
        `- path: ${item.path}`,
        `- response keys: ${responseKeys}`,
      ].join('\n')
    }),
  ].join('\n\n')
}

/**
 * 
 * @param projectId 项目页面的唯一ID 取自上下文的fileId
 * @returns 
 */
export function createApiDocTool( projectId: string) {
  return {
    name: API_DOC_TOOL_NAME,
    title: '获取接口文档',
    description: '根据当前用户需求请求后端服务，获取接口文档和接口 schema，供后续开发 dataSource.js 与 setup.js 使用。',
    parameters: {
      type: 'object',
      properties: {},
    },
    async execute(_params: any, toolContext: any) {
      toolContext.emitProgress?.({
        stage: 'pending',
        message: '正在收集接口文档所需的上下文信息',
      })

      const turns = toolContext.getAgent().getTurns()
      const summary = turns[turns.length - 1]?.summary ?? turns[turns.length - 1]?.coontent;
      const files = await getWhitelistedFileContent(toolContext)
      const fileContent = JSON.stringify(files, null, 2)

      console.log('121212====', { summary, fileContent, projectId })

      toolContext.emitProgress?.({
        stage: 'pending',
        message: '正在请求接口文档服务',
      })

      try {
        const rawResponse = await requestJson<any>({
          baseUrl: DEFAULT_BASE_URL,
          url: API_DOC_URL,
          method: 'POST',
          body: {
            summary ,
            fileContent,
            projectId,
          },
        })

        const apiDocs = normalizeApiDocResponse(rawResponse)

        toolContext.emitProgress?.({
          stage: 'success',
          message: '接口文档获取成功',
        })

        return {
          output: summarizeApiDocs(apiDocs),
          metadata: {
            apiDocs,
          },
        }
      } catch (error) {
        toolContext.emitProgress?.({
          stage: 'error',
          message: `接口文档获取失败：${error instanceof Error ? error.message : String(error)}`,
        })

        return {
          output: `获取接口文档失败：${error instanceof Error ? error.message : String(error)}`,
          metadata: {
            apiDocs: [],
          },
        }
      }
    },
  }
}
