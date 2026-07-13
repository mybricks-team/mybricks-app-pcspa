import axios from 'axios';
import { Logger } from '@mybricks/rocker-commons';

const ESM_PROXY_TARGET = 'http://101.34.207.45:4000/esm';
const ESM_PROXY_TIMEOUT = 30000;

/**
 * ESM.sh 代理服务
 * 将对 esm.sh 的请求代理到内网服务器
 */
export async function proxyEsmRequest(esmPath: string): Promise<{
  data: Buffer;
  contentType: string;
  statusCode: number;
}> {
  // 移除开头的斜杠，确保路径格式正确
  const normalizedPath = esmPath.replace(/^\/+/, '');
  const targetUrl = `${ESM_PROXY_TARGET}/${normalizedPath}`;

  Logger.info(`[esm-proxy] 代理请求: ${esmPath} -> ${targetUrl}`);

  try {
    const response = await axios.get(targetUrl, {
      responseType: 'arraybuffer',
      timeout: ESM_PROXY_TIMEOUT,
      maxRedirects: 5, // 自动跟随重定向
      headers: {
        'Accept': '*/*',
        'User-Agent': 'mybricks-esm-proxy',
      },
      validateStatus: (status) => status < 500, // 接受所有非 5xx 响应
    });

    const contentType = response.headers['content-type'] || 'application/javascript';

    Logger.info(`[esm-proxy] 代理成功: ${esmPath}, status=${response.status}, type=${contentType}`);

    return {
      data: Buffer.from(response.data),
      contentType,
      statusCode: response.status,
    };
  } catch (error) {
    Logger.error(`[esm-proxy] 代理失败: ${esmPath}`, error);
    throw new Error(`ESM 代理请求失败: ${error.message}`);
  }
}
