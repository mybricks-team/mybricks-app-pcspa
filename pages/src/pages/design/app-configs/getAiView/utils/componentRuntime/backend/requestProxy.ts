import type { AxiosRequestConfig, AxiosResponse } from 'axios'
import axios from 'axios'

type HonoApp = {
  fetch: (request: Request) => Promise<Response>
}

let honoApp: HonoApp | null = null

export function setHonoApp(app: HonoApp) {
  honoApp = app
}

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
  if (!honoApp) {
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

  const response = await honoApp.fetch(request)

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
