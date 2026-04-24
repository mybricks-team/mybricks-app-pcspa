import { requestJson } from './request'

export const OPERATE_API_TOOL_NAME = 'operate-api'
const OPERATE_API_URL = '/v1/api-schemes/operate'
const FILE_WHITELIST = ['dataSource.js', 'datasourceScheme.js', 'setup.js', 'requirement.md', 'README.md']
const DEFAULT_BASE_URL = 'http://localhost:3000'

type ApiDocItem = {
  id: string
  cnName: string
  name: string
  originName?: string // 用于删除和更新接口时，标识被操作的接口原始名称
  baseUrl: string
  method: string
  path: string
  response?: any
}

type OperateApiResponse = {
  addList?: ApiDocItem[]
  updateList?: ApiDocItem[]
  deprecatedList?: ApiDocItem[]
}

function normalizeOperateApiResponse(payload: any): OperateApiResponse {
  const data = payload?.data ?? payload ?? {}
  return {
    addList: Array.isArray(data?.addList) ? data.addList : [],
    updateList: Array.isArray(data?.updateList) ? data.updateList : [],
    deprecatedList: Array.isArray(data?.deprecatedList) ? data.deprecatedList : [],
  }
}

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

function summarizeOperateApiResult(result: OperateApiResponse) {
  const { addList = [], updateList = [], deprecatedList = [] } = result

  if (addList.length === 0 && updateList.length === 0 && deprecatedList.length === 0) {
    return '未获取到接口操作结果。无需更新接口'
  }

  const sections: string[] = ['接口文档操作结果如下：']

  if (addList.length > 0) {
    sections.push(
      '新增接口：',
      ...addList.map((item, index) => `${index + 1}. ${item.cnName || item.name} (${item.method} ${item.path})`)
    )
  }

  if (updateList.length > 0) {
    sections.push(
      '更新接口：',
      ...updateList.map((item, index) => `${index + 1}. ${item.cnName || item.name} (${item.method} ${item.path})${item.originName ? `，originName: ${item.originName}` : ''}`)
    )
  }

  if (deprecatedList.length > 0) {
    sections.push(
      '废弃接口：',
      ...deprecatedList.map((item, index) => `${index + 1}. ${item.cnName || item.name || item.id || '未命名接口'}`)
    )
  }

  return sections.join('\n')
}

export function createOperateApiTool(projectId: string) {
  return {
    name: OPERATE_API_TOOL_NAME,
    title: '接口操作',
    description: '根据当前用户需求和项目文件内容，调用后端服务对接口文档执行新增、更新、废弃等操作。',
    parameters: {
      type: 'object',
      properties: {},
    },
    async execute(_params: any, toolContext: any) {
      toolContext.emitProgress?.({
        stage: 'pending',
        message: '正在收集接口操作所需的上下文信息',
      })

      const turns = toolContext.getAgent().getTurns()
      const summary = turns[turns.length - 1]?.summary ?? turns[turns.length - 1]?.coontent;
      console.log('121212====',toolContext.getAgent())
      const files = await getWhitelistedFileContent(toolContext)
      const fileContent = JSON.stringify(files, null, 2)

      toolContext.emitProgress?.({
        stage: 'pending',
        message: '正在请求接口操作服务',
      })

      try {
        const rawResponse = await requestJson<any>({
          baseUrl: DEFAULT_BASE_URL,
          url: OPERATE_API_URL,
          method: 'POST',
          body: {
            summary,
            fileContent,
            projectId,
          },
        })

        const result = normalizeOperateApiResponse(rawResponse)

        toolContext.emitProgress?.({
          stage: 'success',
          message: '接口操作执行成功',
        })

        return {
          output: summarizeOperateApiResult(result),
          metadata: {
            ...result,
          },
        }
      } catch (error) {
        toolContext.emitProgress?.({
          stage: 'error',
          message: `接口操作失败：${error instanceof Error ? error.message : String(error)}`,
        })

        return {
          output: `操作接口文档失败：${error instanceof Error ? error.message : String(error)}`,
          metadata: {
            addList: [],
            updateList: [],
            deprecatedList: [],
          },
        }
      }
    },
  }
}
