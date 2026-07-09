import axios from 'axios';
import { Logger } from '@mybricks/rocker-commons';
import * as fs from 'fs';
import * as path from 'path';
import * as mkdirp from 'mkdirp';
import { rimrafSync } from '../tools';
import API from '@mybricks/sdk-for-app/api';
import { getNextVersion } from '../tools/analysis';

const FormData = require('form-data');
const archiver = require('archiver');

export const VIBE_ENV_TYPE = 'ai-agent'

export interface VibePublishParams {
  userId: string;
  fileId: number;
  groupId: string;
  customApiUrl: string;
  html: string;
  baseUrl?: string;
}

export interface VibePublishResult {
  uploadUrl?: string;
  uploadResult?: any;
  zipFilePath: string;
}

const MAX_DOWNLOAD_SIZE = 200 * 1024 * 1024; // 200MB

function resolveUrl(rawUrl: string, baseUrl?: string): string | null {
  const urlText = String(rawUrl || '').trim();
  if (!urlText) {
    return null;
  }

  if (/^data:/i.test(urlText) || /^javascript:/i.test(urlText) || /^mailto:/i.test(urlText)) {
    return null;
  }

  try {
    if (/^\/\//.test(urlText)) {
      return new URL(urlText, 'https://example.com').href;
    }

    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(urlText)) {
      return new URL(urlText).href;
    }

    if (baseUrl) {
      return new URL(urlText, baseUrl).href;
    }
  } catch (e) {
    Logger.warn(`[vibepublish] 无法解析 URL: ${urlText} (${e?.message || e})`);
  }

  return null;
}

function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function getLocalAssetPath(assetUrl: string): string {
  const parsed = new URL(assetUrl);
  const segments = parsed.pathname.split('/').filter(Boolean);
  const isMfs = segments.some((segment) => segment === 'mfs');
  const folder = isMfs ? '' : 'public';
  const normalizedSegments = segments[0] === folder ? segments.slice(1) : segments;

  let assetPath = normalizedSegments.length ? path.posix.join(...normalizedSegments) : 'index';
  if (assetPath.endsWith('/')) {
    assetPath = path.posix.join(assetPath, 'index');
  }

  if (!path.posix.extname(assetPath)) {
    assetPath += '.bin';
  }

  return path.posix.join(folder, assetPath);
}

function normalizeLocalPath(localPath: string): string {
  return localPath.replace(/^\/+/, '').replace(/\\/g, '/');
}

function ensureResourceMapping(
  url: string,
  mapping: Map<string, string>,
): string {
  if (mapping.has(url)) {
    return mapping.get(url) as string;
  }

  const localPath = normalizeLocalPath(getLocalAssetPath(url));
  mapping.set(url, localPath);
  return localPath;
}

function rewriteSrcset(value: string, baseUrl?: string, mapping?: Map<string, string>): string {
  return value
    .split(',')
    .map((item) => {
      const parts = item.trim().split(/\s+/);
      const rawUrl = parts[0];
      const absUrl = resolveUrl(rawUrl, baseUrl);
      if (!absUrl || !isHttpUrl(absUrl)) {
        return item;
      }
      const localPath = ensureResourceMapping(absUrl, mapping as Map<string, string>);
      return [localPath, ...parts.slice(1)].join(' ');
    })
    .join(', ');
}

function localizeHtmlAssets(html: string, baseUrl?: string) {
  const mapping = new Map<string, string>();

  const replaceAttr = (
    pattern: RegExp,
    attrIndex: number,
    includeTagFilter?: (tag: string) => boolean,
  ) => {
    html = html.replace(pattern, (...args: any[]) => {
      const fullMatch = args[0] as string;
      const url = args[attrIndex] as string;
      const tag = fullMatch;

      if (includeTagFilter && !includeTagFilter(tag)) {
        return fullMatch;
      }

      const absUrl = resolveUrl(url, baseUrl);
      if (!absUrl || !isHttpUrl(absUrl)) {
        return fullMatch;
      }

      const localPath = ensureResourceMapping(absUrl, mapping);
      return fullMatch.replace(url, localPath);
    });
  };

  // script src
  replaceAttr(/(<script\b[^>]*\bsrc=['"])([^'"\s]+)(['"][^>]*>)/gi, 2);
  // image / media src
  replaceAttr(/(<(?:img|video|audio|source|iframe|embed|object)\b[^>]*\b(?:src|data)=['"])([^'"\s]+)(['"][^>]*>)/gi, 2);
  // link rel=stylesheet href
  replaceAttr(/(<link\b[^>]*\bhref=['"])([^'"\s]+)(['"][^>]*>)/gi, 2, (tag) => /\brel\s*=\s*['"]?stylesheet['"]?/i.test(tag));
  // srcset attributes
  html = html.replace(/(<img\b[^>]*\bsrcset=['"])([^'"]+)(['"])/gi, (_match, prefix, value, suffix) => {
    return prefix + rewriteSrcset(value, baseUrl, mapping) + suffix;
  });

  // CSS url(...) references in inline styles and style blocks
  // 先把 <script> 内容用占位符替换，避免 JS 代码里的 .url(...) 被误匹配
  const scriptPlaceholders: string[] = [];
  html = html.replace(/<script[\s\S]*?<\/script>/gi, (match) => {
    const placeholder = `<!--__SCRIPT_PLACEHOLDER_${scriptPlaceholders.length}__-->`;
    scriptPlaceholders.push(match);
    return placeholder;
  });

  html = html.replace(/url\(\s*(["']?)([^\)"']+)\1\s*\)/gi, (_match, quote, rawUrl) => {
    const absUrl = resolveUrl(rawUrl, baseUrl);
    if (!absUrl || !isHttpUrl(absUrl)) {
      return _match;
    }
    const localPath = ensureResourceMapping(absUrl, mapping);
    return `url(${quote}${localPath}${quote})`;
  });

  // 恢复 <script> 内容
  html = html.replace(/<!--__SCRIPT_PLACEHOLDER_(\d+)__-->/g, (_match, index) => {
    return scriptPlaceholders[parseInt(index, 10)] || _match;
  });

  return { html, resourceUrls: Array.from(mapping.keys()), mapping };
}

async function downloadAsset(url: string): Promise<Buffer> {
  Logger.info(`[vibepublish] 下载资源: ${url}`);
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: Number(process.env.VIBE_PUBLISH_ASSET_DOWNLOAD_TIMEOUT_MS ?? 20000),
    maxBodyLength: MAX_DOWNLOAD_SIZE,
    maxContentLength: MAX_DOWNLOAD_SIZE,
    headers: {
      Accept: '*/*',
    },
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`资源下载失败: ${url}, status=${response.status}`);
  }

  return Buffer.from(response.data);
}

async function createZipPackage(
  html: string,
  resourceMapping: Map<string, string>,
  baseDir: string,
): Promise<string> {
  const zipName = `vibepublish-${Date.now()}.zip`;
  const zipFilePath = path.join(baseDir, zipName);
  const outputDir = path.join(baseDir, 'payload');

  rimrafSync(outputDir);
  mkdirp.sync(outputDir);

  const indexPath = path.join(outputDir, 'index.html');
  fs.writeFileSync(indexPath, html, 'utf8');

  for (const entry of resourceMapping.entries()) {
    const url = entry[0];
    const localPath = entry[1];
    const buffer = await downloadAsset(url);
    const localFilePath = path.join(outputDir, ...localPath.split('/'));
    mkdirp.sync(path.dirname(localFilePath));
    fs.writeFileSync(localFilePath, buffer);
  }

  const output = fs.createWriteStream(zipFilePath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  const archivePromise = new Promise<void>((resolve, reject) => {
    output.on('close', () => resolve());
    output.on('error', reject);
    archive.on('error', reject);
  });

  archive.pipe(output);
  archive.directory(outputDir, false);
  await archive.finalize();
  await archivePromise;

  return zipFilePath;
}

async function uploadZipToCustomApi(
  customApiUrl: string,
  zipFilePath: string,
  zipName: string,
  params: { groupId: string; fileId: number; version: string; },
) {
  if (!customApiUrl) {
    throw new Error('VIBE_PUBLISH_CUSTOM_API_URL is not configured.');
  }

  const form = new FormData();
  form.append('file', fs.createReadStream(zipFilePath), { filename: zipName });
  form.append('fileId', String(params.fileId));
  form.append('groupId', String(params.groupId));
  form.append('version', params.version);
  form.append('env', 'prod');

  console.log('------custom API 上传参数------', customApiUrl, params);

  Logger.info(`[vibepublish] 上传 ZIP 到 custom API: ${customApiUrl}`);

  const response = await axios.post(customApiUrl, form, {
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 120000,
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`custom API 上传失败 status=${response.status}`);
  }

  console.log('custom API 上传成功', response.data);

  return response.data?.data?.accessPath;
}

export async function publishVibeHtml(params: VibePublishParams): Promise<VibePublishResult> {
  const { html, baseUrl, customApiUrl, fileId, groupId } = params;

  Logger.info(`[vibepublish] 开始本地化 HTML 外部资源，fileId=${fileId}`);
  const { html: localizedHtml, resourceUrls, mapping } = localizeHtmlAssets(html, baseUrl);

  Logger.info(`[vibepublish] 发现 ${resourceUrls.length} 个外部资源`);
  const tempBaseDir = path.join(
    path.resolve(__dirname, '../../..', '_temp_'),
    `vibepublish-${fileId}-${Date.now()}`,
  );
  mkdirp.sync(tempBaseDir);

  try {
    const latestPub = (
      await API.File.getLatestPub({
        fileId,
      })
    )?.[0];
    const version = getNextVersion(latestPub?.version);
    Logger.info(`[publish] next version is begin ${version}`);

    const zipFilePath = await createZipPackage(localizedHtml, mapping, tempBaseDir);
    const zipName = path.basename(zipFilePath);

    const uploadUrl = await uploadZipToCustomApi(customApiUrl, zipFilePath, zipName, { fileId, groupId, version });

    return {
      uploadUrl,
      zipFilePath,
    };
  } finally {
    rimrafSync(tempBaseDir);
  }
}
