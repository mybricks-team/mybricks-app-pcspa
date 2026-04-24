type RequestOptions = {
  baseUrl?: string;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  timeoutMs?: number;
  retries?: number;
  credentials?: RequestCredentials;
};

const DEFAULT_BASE_URL = "http://localhost:3000";
const DEFAULT_TIMEOUT_MS = 30000;  // 30秒
const DEFAULT_RETRIES = 1;

function buildUrl(baseUrl: string, url: string) {
  if (/^https?:\/\//.test(url)) {
    return url;
  }
  return `${baseUrl.replace(/\/$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function formatError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export async function requestJson<T = any>(options: RequestOptions): Promise<T> {
  const {
    baseUrl = DEFAULT_BASE_URL,
    url,
    method = "GET",
    headers = {},
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    credentials = "omit",
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller
      ? window.setTimeout(() => controller.abort(), timeoutMs)
      : null;

    try {
      const response = await fetch(buildUrl(baseUrl, url), {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller?.signal,
        credentials,
      });

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      lastError = isAbortError(error)
        ? new Error(`Request timeout after ${timeoutMs}ms`)
        : error;

      if (attempt >= retries) {
        break;
      }
    }
  }

  throw new Error(formatError(lastError));
}
