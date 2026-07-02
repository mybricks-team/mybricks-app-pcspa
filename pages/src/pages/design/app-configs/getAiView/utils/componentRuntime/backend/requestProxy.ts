/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import type { AxiosRequestConfig, AxiosResponse } from 'axios'
import axios from 'axios'
import { Hono } from 'hono'

class HonoApp {
  app: Hono | null = null

  honos = new Map<string, Hono>()

  ready: boolean = false

  logger: any

  init() {
    this.app = new Hono()

    if (!this.logger) {
      return
    }

    const serverLogger = this.logger.child({ module: 'server' })

    const createRequestId = () => {
      return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    }

    const requestHandle = async (c: any, next: any) => {
      const requestId = c.req.header('x-request-id') ?? createRequestId()
      const startedAt = Date.now()
      const requestLogger = serverLogger.child({
        requestId,
        method: c.req.method,
        path: c.req.path,
      })

      c.set('logger', requestLogger)
      c.header('x-request-id', requestId)

      try {
        await next()
      } catch (error) {
        requestLogger.error({ error }, '服务端请求异常')

        return c.json({ result: -1, error_msg: '服务异常，请稍后重试' }, 500)
      } finally {
        requestLogger.info(
          {
            status: c.res.status,
            duration: Date.now() - startedAt,
          },
          '服务端请求完成',
        )
      }
    }
    this.app.use('*', requestHandle)

    Object.entries(Object.fromEntries(this.honos)).forEach(([id, hono]) => {
      this.app?.route(id, hono)
    })
  }

  clear() {
    this.app = null
    this.honos = new Map()
  }
}

export const honoApp = new HonoApp()

window._honoApp = honoApp

type PlatformRequestContext = {
  userId?: string
}

let platformRequestContext: PlatformRequestContext = {}

export function setPlatformRequestContext(context: PlatformRequestContext) {
  platformRequestContext = context
}

const isApiPath = (rawUrl?: string): boolean => {
  if (!rawUrl) return false
  return (
    rawUrl === 'api' ||
    rawUrl === '/api' ||
    rawUrl.startsWith('api/') ||
    rawUrl.startsWith('/api/')
  )
}

const fallbackAxios = axios.create()

async function httpRequest(config: AxiosRequestConfig): Promise<AxiosResponse> {
  const restConfig = { ...config }
  delete restConfig.adapter
  return fallbackAxios.request(restConfig)
}

async function honoRequest(config: AxiosRequestConfig): Promise<AxiosResponse> {
  if (!honoApp.app) {
    throw new Error(
      '[requestProxy] No Hono app registered. Make sure to create a Hono instance.',
    )
  }

  const baseURL = config.baseURL || ''
  const url = new URL(config.url || '/', baseURL || 'http://localhost')

  if (config.params) {
    Object.entries(config.params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value))
    })
  }

  const method = (config.method || 'GET').toUpperCase()
  const hasBody = !['GET', 'HEAD'].includes(method)

  let body: string | undefined
  if (hasBody && config.data !== undefined) {
    body =
      typeof config.data === 'string'
        ? config.data
        : JSON.stringify(config.data)
  }

  const headers = new Headers()
  if (config.headers) {
    Object.entries(config.headers).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        headers.set(key, String(value))
      }
    })
  }
  if (hasBody && body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (platformRequestContext.userId) {
    headers.set('x-username', platformRequestContext.userId)
  }

  const request = new Request(url.toString(), {
    method,
    headers,
    body: hasBody ? body : undefined,
  })

  if (!honoApp.ready) {
    honoApp.ready = true
    honoApp.init()
  }

  const response = await honoApp.app.fetch(request)

  const responseText = await response.text()
  let responseData: unknown
  try {
    responseData = JSON.parse(responseText)
  } catch {
    responseData = responseText
  }

  const responseHeaders: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value
  })

  if (response.status >= 200 && response.status < 300) {
    return {
      data: responseData,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      config,
      request,
    } as AxiosResponse
  } else {
    const error = new Error(
      `Request failed with status code ${response.status}`,
    ) as Error & { response: unknown }
    error.response = {
      data: responseData,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      config,
    }
    throw error
  }
}

const componentAxios = axios.create({
  adapter: async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    if (isApiPath(config.url)) {
      return honoRequest(config)
    }
    return httpRequest(config)
  },
})

export default componentAxios
