/**
 * mysql2/promise browser compat — routes all SQL queries to an HTTP endpoint.
 *
 * This shim implements a subset of the mysql2/promise API surface so that
 * AI-generated server-side code using `mysql2/promise` can run in the browser
 * during design-time preview/testing.
 *
 * All queries are forwarded via POST to `_queryUrl` with body:
 *   { sql: string, params?: any[], fileId?: string, tableEnv?: 'debug' | 'prod' }
 *
 * The endpoint is expected to respond with:
 *   { result: 1, error_msg: 'success', data: { rows, fields? } }
 */

let _queryUrl = ''
let _fileId = ''

export const setMysqlQueryUrl = (url: string) => {
  _queryUrl = url
}

export const setMysqlFileId = (fileId?: string | number) => {
  _fileId = fileId === undefined || fileId === null ? '' : String(fileId)
}

export const getMysqlFileId = () => _fileId

export const getMysqlQueryUrl = () => _queryUrl

export type MysqlTableEnv = 'debug' | 'prod'

export type MysqlQueryBodyOptions = {
  fileId?: string
  tableEnv?: MysqlTableEnv
}

/** 组装 /ds/query 请求体 */
export const createMysqlQueryBody = (
  sql: string,
  params?: any[],
  options?: MysqlQueryBodyOptions,
) => {
  const fileId = options?.fileId || _fileId
  return {
    sql,
    params: params ?? [],
    ...(fileId ? { fileId } : {}),
    ...(options?.tableEnv ? { tableEnv: options.tableEnv } : {}),
  }
}

type MysqlQueryApiEnvelope = {
  result?: number
  error_msg?: string
  data?: {
    rows?: any[]
    fields?: { name: string; type?: any }[]
  }
  rows?: any[]
  fields?: { name: string; type?: any }[]
}

export type MysqlQueryPayload = {
  rows: any[]
  fields: { name: string; type?: any }[]
}

type RuntimeLogger = Pick<Console, 'log' | 'error'>

/** 解析 /ds/query 响应，兼容 envelope 与旧版平铺结构 */
export function parseMysqlQueryResponse(payload: unknown): MysqlQueryPayload {
  const body = payload as MysqlQueryApiEnvelope

  if (body && typeof body === 'object' && 'result' in body) {
    if (body.result !== 1) {
      throw new Error(body.error_msg || '数据库查询失败')
    }
    return {
      rows: body.data?.rows ?? [],
      fields: body.data?.fields ?? [],
    }
  }

  return {
    rows: body?.rows ?? [],
    fields: body?.fields ?? [],
  }
}

async function httpQuery(
  sql: string,
  params?: any[],
): Promise<MysqlQueryPayload> {
  const url = getMysqlQueryUrl()
  if (!url) {
    throw new Error(
      '[mysql2/promise compat] 未配置 MySQL 查询接口地址，请在数据库插件面板中填写 Query url。',
    )
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      createMysqlQueryBody(sql, params, { tableEnv: 'debug' }),
    ),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`[mysql2/promise compat] HTTP ${res.status}: ${text}`)
  }

  return parseMysqlQueryResponse(await res.json())
}

// ──────────────────────────────────────────────────────────────────────────────
// Connection (mysql2/promise PoolConnection / Connection compatible)
// ──────────────────────────────────────────────────────────────────────────────

class MysqlCompatConnection {
  async execute(sql: string, params?: any[]): Promise<[any[], any[]]> {
    const { rows, fields } = await httpQuery(sql, params)
    return [rows, fields ?? []]
  }

  async query(sql: string, params?: any[]): Promise<[any[], any[]]> {
    return this.execute(sql, params)
  }

  release() {}

  async end() {}

  async beginTransaction() {}

  async commit() {}

  async rollback() {}
}

// ──────────────────────────────────────────────────────────────────────────────
// Pool (mysql2/promise Pool compatible)
// ──────────────────────────────────────────────────────────────────────────────

class MysqlCompatPool {
  async execute(sql: string, params?: any[]): Promise<[any[], any[]]> {
    const { rows, fields } = await httpQuery(sql, params)
    return [rows, fields ?? []]
  }

  async query(sql: string, params?: any[]): Promise<[any[], any[]]> {
    return this.execute(sql, params)
  }

  async getConnection(): Promise<MysqlCompatConnection> {
    return new MysqlCompatConnection()
  }

  async end() {}
}

// ──────────────────────────────────────────────────────────────────────────────
// Factory functions — mirror the mysql2/promise API
// ──────────────────────────────────────────────────────────────────────────────

function createConnection(_config?: any): MysqlCompatConnection {
  return new MysqlCompatConnection()
}

function createPool(_config?: any): MysqlCompatPool {
  return new MysqlCompatPool()
}

/**
 * Drop-in replacement for the `mysql2/promise` npm package in the browser.
 * Inject this as the `mysql2/promise` dependency in getDependencies so that
 * AI-generated server code using `mysql2/promise` routes queries via HTTP.
 */
export const Mysql2PromiseCompat = createMysql2PromiseCompat()

export function createMysql2PromiseCompat(options?: {
  logger?: RuntimeLogger
}) {
  const logger = options?.logger

  class LoggedPool {
    async execute(sql: string, params?: any[]): Promise<[any[], any[]]> {
      logger?.log('[SQL] query：', {
        sql,
        params: params ?? [],
      })

      try {
        const { rows, fields } = await httpQuery(sql, params)
        const result: [any[], any[]] = [rows, fields ?? []]

        logger?.log('[SQL] response：', {
          sql,
          params: params ?? [],
          result: rows,
        })

        return result
      } catch (error) {
        logger?.error('[SQL] error：', {
          sql,
          params: params ?? [],
          error,
        })
        throw error
      }
    }

    async query(sql: string, params?: any[]): Promise<[any[], any[]]> {
      return this.execute(sql, params)
    }

    async getConnection(): Promise<MysqlCompatConnection> {
      return new MysqlCompatConnection()
    }

    async end() {}
  }

  return {
    createConnection,
    createPool: logger ? () => new LoggedPool() : createPool,
    default: {
      createConnection,
      createPool: logger ? () => new LoggedPool() : createPool,
    },
  }
}

export { MysqlCompatConnection as Connection, MysqlCompatPool as Pool }
