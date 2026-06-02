import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
// ==================== 类型定义 ====================

export interface ManateeRuntimeConfig {
  baseUrl: string;
  apiKey: string;
  workspaceName?: string;
  workspaceHeader?: string;
  workspaceProjectId?: number;
  workspaceHost?: string;
  workspaceGroups?: Array<string>;
}

export interface ManateeConfig {
  domain?: string;
  apiKey?: string;
  workspaceName?: string;
  workspaceHost?: string;
  workspaceProjectId?: number;
  workspaceGroups?: Array<string>;
}

type GetManateeConfig = () => ManateeConfig | undefined;

export interface ManateeWorkspaceOption {
  label: string;
  title?: string;
  key?: string;
  datasource?: string;
}

export const MANATEE_ALL_WORKSPACE_VALUE = "__all__";

// ----- 海牛模块树结构（来自 /biz/modularity/project0/getAllModules）-----

interface ModuleTreeNode {
  title: string;
  key: string | number;
  parentId: string | number;
  isLeaf?: boolean;
  children?: ModuleTreeNode[];
  module?: {
    id: number;
    moduleCode: string;
    moduleName: string;
    moduleDescription: string | null;
    manateeUrl: string;
    docUrl: string;
    requestMode: string; // POST / GET
  };
}

interface FlattenedModule {
  node: ModuleTreeNode;
  moduleId: string;
  moduleCode: string;
  path: string; // 分组路径，如 "ordersystem/controller/OrderController"
}

// ----- 海牛模块详情结构（来自 /biz/customizeModule.do）-----

interface ModuleDetailRaw {
  module: {
    id: number;
    moduleCode: string;
    moduleName: string;
    moduleDescription: string | null;
    requestMode: string;
    params: string; // JSON 字符串，包含 paramVerify / host / headers / post / get
    processConf?: string; // 流程配置（JS/SQL 等）
    chartUrl?: string;
    conf?: string;
    env?: string;
    host?: string; // 部分模块直接有 host
  };
}

interface ParsedModuleParams {
  paramVerify: Record<string, { required?: boolean; type?: string; description?: string }>;
  host?: string;
  headers?: Array<{ KEY: string; VALUE: string; DESC?: string }>;
  post?: Record<string, any>;
  get?: Record<string, any>;
  usedKey?: string;
}

interface ModuleParamField {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  example?: any;
}

interface ModuleApiDetail {
  moduleCode: string;
  moduleName: string;
  description?: string | null;
  requestMode: string;
  host?: string;
  headers: Array<{ KEY: string; VALUE: string; DESC?: string }>;
  params: ModuleParamField[];
  requestExample?: Record<string, any>;
  processConf?: string;
  docUrl?: string;
  path?:string
}

// 错误分类
interface ManateeError {
  code: string;
  status?: number;
  message: string;
  suggestion: string;
}

// ==================== 常量配置 ====================

const MYBRICKS_PROXY_HOST = "my.mybricks.world";
const MYBRICKS_PROXY_PATH = "/paas/api/proxy";

// ==================== 工具函数 ====================

function normalizeBaseUrl(domain = ""): string {
  return domain.trim().replace(/\/+$/, "");
}

function shouldUseMybricksProxy(): boolean {
  return typeof window !== "undefined" && window.location?.hostname === MYBRICKS_PROXY_HOST;
}

function resolveAxiosRequestUrl(config: AxiosRequestConfig): string {
  const url = config.url || "";
  try {
    return new URL(url).href;
  } catch {
    if (config.baseURL) {
      try {
        return new URL(url, config.baseURL).href;
      } catch {
        return "";
      }
    }
    return "";
  }
}

function isManateeAxiosRequest(config: AxiosRequestConfig, baseUrl: string): boolean {
  const requestUrl = resolveAxiosRequestUrl(config);
  if (!requestUrl || !baseUrl) return false;
  try {
    const request = new URL(requestUrl);
    const target = new URL(baseUrl);
    return request.origin === target.origin && request.pathname.startsWith(target.pathname);
  } catch {
    return false;
  }
}

// ==================== 错误分类系统 ====================

function classifyManateeError(status: number, bodyText?: string): ManateeError {
  const errors: Record<number, ManateeError> = {
    400: {
      code: "INVALID_REQUEST",
      status: 400,
      message: "请求参数格式错误",
      suggestion: "请检查 filter、fields 等查询参数是否符合 JSON 格式",
    },
    401: {
      code: "UNAUTHORIZED",
      status: 401,
      message: "API Key 无效或已过期",
      suggestion: "请前往海牛管理端「设置 / API Keys」重新生成有效的 Key",
    },
    403: {
      code: "FORBIDDEN",
      status: 403,
      message: "API Key 权限不足",
      suggestion: "当前 Key 缺少对该实体或操作的访问权限，请在管理端配置角色权限",
    },
    404: {
      code: "NOT_FOUND",
      status: 404,
      message: "模块或接口不存在",
      suggestion: "请确认 moduleCode 拼写正确，或先调用 get_api_list 查看可用模块",
    },
    429: {
      code: "RATE_LIMIT",
      status: 429,
      message: "请求频率超限",
      suggestion: "请求过于频繁，请降低调用频率或联系管理员提升配额",
    },
    500: {
      code: "SERVER_ERROR",
      status: 500,
      message: "海牛服务端内部错误",
      suggestion: "服务端异常，请稍后重试或联系技术支持查看系统日志",
    },
    502: {
      code: "BAD_GATEWAY",
      status: 502,
      message: "网关错误，无法连接到海牛服务",
      suggestion: "请确认域名配置正确，服务是否正常运行",
    },
  };

  return (
    errors[status] || {
      code: "UNKNOWN_ERROR",
      status,
      message: `未知错误 (HTTP ${status})`,
      suggestion: bodyText
        ? `服务端返回：${bodyText.slice(0, 200)}`
        : "请检查网络连接和域名配置",
    }
  );
}

// ==================== 海牛连接器核心类 ====================

export class ManateeConnector {
  private interceptorInstalled = false;
  private getConfig: GetManateeConfig | null = null;
  private workspaces: ManateeWorkspaceOption[] = [];

  // 缓存系统
  private moduleTreeCache = new Map<string, { data: ModuleTreeNode[]; timestamp: number }>();
  private moduleDetailCache = new Map<string, { data: ModuleDetailRaw; timestamp: number }>();
  private readonly CACHE_TTL = 60_000; // 1分钟
  // 模块元数据映射：moduleId -> { moduleCode, manateeUrl }
  // 用于在查详情时补齐 manateeUrl（因为详情接口不返回这个字段）
  private moduleMetaMap = new Map<string, { moduleCode: string; manateeUrl: string }>();


  constructor(getConfig: GetManateeConfig) {
    this.getConfig = getConfig;
    this.installAxiosInterceptor();
  }

  // ---------- 配置读取 ----------

  private getRuntimeConfig(): ManateeRuntimeConfig {
    const config = this.getConfig?.() || {};
    const baseUrl = normalizeBaseUrl(config.domain);
    const apiKey = config.apiKey?.trim?.() || "";

    if (!baseUrl || !apiKey) {
      throw new Error("请先在「连接海牛」插件中配置域名和 API Key");
    }

    if (!/^https?:\/\/.+/i.test(baseUrl)) {
      throw new Error("域名需以 http:// 或 https:// 开头");
    }

    return {
      ...config,
      baseUrl,
      apiKey,
    };
  }

  // ---------- 工作空间管理 ----------

  setWorkspaces(workspaces: ManateeWorkspaceOption[]): void {
    this.workspaces = workspaces;
  }

  clearWorkspaces(): void {
    this.workspaces = [];
  }

  getWorkspaces(): ManateeWorkspaceOption[] {
    return [...this.workspaces];
  }

  // ---------- Axios 拦截器 ----------

  private installAxiosInterceptor(): void {
    if (this.interceptorInstalled) return;
    this.interceptorInstalled = true;

    const originalCreate = axios.create.bind(axios);

    axios.create = ((...args: Parameters<typeof axios.create>) => {
      const instance = originalCreate(...args);
      instance.interceptors.request.use((config) => this.applyAxiosConfig(config));
      return instance;
    }) as typeof axios.create;
  }

  private applyAxiosConfig(requestConfig: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
    try {
      const config = this.getRuntimeConfig();
      const matched = isManateeAxiosRequest(requestConfig, config.baseUrl);

      if (!matched) return requestConfig;

      requestConfig.withCredentials = false;

      if (!requestConfig.headers) {
        requestConfig.headers = new axios.AxiosHeaders();
      }

      const headers = requestConfig.headers;
      if (headers instanceof axios.AxiosHeaders) {
        if (config.workspaceHeader) {
          headers.set("x-workspace-view", config.workspaceHeader);
        }
      }

      if (shouldUseMybricksProxy()) {
        headers.set("X-Target-Url", resolveAxiosRequestUrl(requestConfig));
        requestConfig.url = MYBRICKS_PROXY_PATH;
        requestConfig.baseURL = undefined;
      }

      return requestConfig;
    } catch {
      return requestConfig;
    }
  }

  // ---------- Fetch 请求封装 ----------

  createFetchRequest(targetUrl: string, apiKey: string, workspaceHeader?: string) {

    let session = localStorage.getItem("session") || "";
    let token = localStorage.getItem("token") || ""
    if(session) {
     session =  atob(atob(session))
    }
    if(token) { 
       token =  atob(atob(token))
    }
    const headers = new Headers({
      Accept: "application/json",
      Token: token,
      Session: session
    });

    if (workspaceHeader) {
      headers.set("x-workspace-view", workspaceHeader);
    }

    if (shouldUseMybricksProxy()) {
      headers.set("X-Target-Url", targetUrl);
      return { url: MYBRICKS_PROXY_PATH, init: { headers } as RequestInit };
    }

    return { url: targetUrl, init: { headers } as RequestInit };
  }

  // ---------- 工作空间列表解析 ----------

  async fetchSpaceTree(): Promise<ModuleTreeNode[]> {
    const config = this.getRuntimeConfig();
    const cacheKey = `${config.baseUrl}:tree`;

    const cached = this.moduleTreeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    const url = `${config.baseUrl}/biz/customizeModule.do?lowcodeProjectId=0&lowcodeModule=queryProject`;
    const request = this.createFetchRequest(url, config.apiKey, config.workspaceHeader);

    const headers = new Headers(request.init?.headers as HeadersInit);
    headers.set("Content-Type", "application/json");

    let response: Response;
    try {
      response = await fetch(request.url, {
        ...request.init,
        method: "POST",
        headers,
        body: JSON.stringify({}), // 如有需要可传入 workspace 等过滤条件
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`海牛工作空间获取失败：${reason}。请确认域名和 API Key 配置正确。`);
    }

    if (!response.ok) {
      let bodyText = "";
      try {
        bodyText = await response.text();
      } catch { /* ignore */ }

      const classified = classifyManateeError(response.status, bodyText);
      throw new Error(
        `[${classified.code}] ${classified.message} (HTTP ${response.status})\n建议：${classified.suggestion}`
      );
    }

    let body: any;
    try {
      body = await response.json();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`海牛返回内容解析失败：${reason}。请确认服务端返回的是 JSON 格式。`);
    }

    const treeData = Array.isArray(body) ? body : body?.data.outputData;
    if (!Array.isArray(treeData)) {
      throw new Error("海牛工作空间返回格式异常：应为数组。请确认当前域名对应的是海牛服务。");
    }

    this.moduleTreeCache.set(cacheKey, { data: treeData, timestamp: Date.now() });
    return treeData;
  }

  // ---------- 模块树获取（带缓存） ----------

  async fetchModuleTree(): Promise<ModuleTreeNode[]> {
    const config = this.getRuntimeConfig();
    const cacheKey = `${config.workspaceProjectId}:tree`;

    const cached = this.moduleTreeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    const url = `${config.baseUrl}/biz/modularity/project0/getAllModules`;
    const request = this.createFetchRequest(url, config.apiKey, config.workspaceHeader);

    const headers = new Headers(request.init?.headers as HeadersInit);
    headers.set("Content-Type", "application/json");

    let response: Response;
    try {
      const { workspaceProjectId, workspaceHost } = config; // 预留接口参数位置
      response = await fetch(request.url, {
        ...request.init,
        method: "POST",
        headers,
        body: JSON.stringify({
          projectId: workspaceProjectId,
          datasource: workspaceHost,
        }), // 如有需要可传入 workspace 等过滤条件
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`海牛模块树获取失败：${reason}。请确认域名和 API Key 配置正确。`);
    }

    if (!response.ok) {
      let bodyText = "";
      try {
        bodyText = await response.text();
      } catch { /* ignore */ }

      const classified = classifyManateeError(response.status, bodyText);
      throw new Error(
        `[${classified.code}] ${classified.message} (HTTP ${response.status})\n建议：${classified.suggestion}`
      );
    }

    let body: any;
    try {
      body = await response.json();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`海牛返回内容解析失败：${reason}。请确认服务端返回的是 JSON 格式。`);
    }

    const treeData = Array.isArray(body) ? body : body?.data.list;
    if (!Array.isArray(treeData)) {
      throw new Error("海牛模块树返回格式异常：应为数组。请确认当前域名对应的是海牛服务。");
    }

    this.moduleTreeCache.set(cacheKey, { data: treeData, timestamp: Date.now() });
    return treeData;
  }

  clearModuleTreeCache(): void {
    this.moduleTreeCache.clear();
  }

  // ---------- 模块详情获取（带缓存） ----------

  async fetchModuleDetail(moduleId: string): Promise<ModuleDetailRaw> {
    const config = this.getRuntimeConfig();
    const cacheKey = `${config.baseUrl}:${moduleId}`;

    const cached = this.moduleDetailCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    const { workspaceHost,workspaceProjectId } = config; // 预留接口参数位置
    // 海牛查询模块参数的接口
    const url = `${config.baseUrl}/biz/customizeModule.do?lowcodeProjectId=0&lowcodeModule=queryModuleParams`;
    const request = this.createFetchRequest(url, config.apiKey, config.workspaceHeader);
    const headers = new Headers(request.init?.headers as HeadersInit);
    headers.set("Content-Type", "application/json");

    let response: Response;

    try {
      response = await fetch(request.url, {
        ...request.init,
        method: 'POST',
        headers,
        body: JSON.stringify({
          moduleId: Number(moduleId),
          datasource: workspaceHost,
        }),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`海牛模块详情获取失败（${moduleId}）：${reason}`);
    }

    if (!response.ok) {
      let bodyText = "";
      try {
        bodyText = await response.text();
      } catch { /* ignore */ }

      const classified = classifyManateeError(response.status, bodyText);
      throw new Error(
        `[${classified.code}] ${classified.message} (HTTP ${response.status})\n模块：${moduleId}\n建议：${classified.suggestion}`
      );
    }

    let body: any;
    try {
      body = await response.json();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`海牛模块详情解析失败（${moduleId}）：${reason}`);
    }

    if (!body?.data.module) {
      throw new Error(`未找到模块详情：${moduleId}。请确认模块ID正确。`);
    }

    this.moduleDetailCache.set(cacheKey, { data: body.data, timestamp: Date.now() });
    return body;
  }

  clearModuleDetailCache(): void {
    this.moduleDetailCache.clear();
  }

  // ---------- 模块树解析 ----------

  flattenModuleTree(nodes: ModuleTreeNode[], parentPath = ""): FlattenedModule[] {
    const result: FlattenedModule[] = [];

    for (const node of nodes) {
      const currentPath = parentPath ? `${parentPath}/${node.title}` : node.title;
      if (node.isLeaf && node.module) {
        const moduleId = String(node.module.id);
        // 缓存 moduleId -> manateeUrl 映射，供详情查询使用
        this.moduleMetaMap.set(moduleId, {
          moduleCode: node.module.moduleCode,
          manateeUrl: node.module.manateeUrl || "modularity",
        });

        result.push({
          node,
          path: currentPath,
          moduleId: String(node.module.id),      // ← 提取 ID
          moduleCode: node.module.moduleCode,
        });
      }
      if (Array.isArray(node.children) && node.children.length > 0) {
        result.push(...this.flattenModuleTree(node.children, currentPath));
      }
    }
    return result;
  }

  // ---------- 参数解析 ----------

  parseModuleParams(paramsJson: string): ParsedModuleParams {
    try {
      const parsed = JSON.parse(paramsJson) as ParsedModuleParams;
      return {
        paramVerify: parsed.paramVerify || {},
        host: parsed.host,
        headers: parsed.headers || [],
        post: parsed.post,
        get: parsed.get,
        usedKey: parsed.usedKey,
      };
    } catch {
      return { paramVerify: {}, headers: [] };
    }
  }

  // ---------- 模块详情构建 ----------

  private buildModuleApiDetail(raw: ModuleDetailRaw): ModuleApiDetail {
    const mod = raw.module;
    const parsed = this.parseModuleParams(mod.params);
    const config = this.getRuntimeConfig();

     // 补齐 manateeUrl（优先用详情里的，否则用模块树缓存的）
    const meta = this.moduleMetaMap.get(String(mod.id));
    const manateeUrl = meta?.manateeUrl || "modularity";
    const projectId = config.workspaceProjectId ?? 0;
    const moduleCode = mod.moduleCode || meta?.moduleCode || "";

    // 拼接完整请求路径
    const host = config.workspaceHost?.replace(/\/$/, "") || "";
    const path = host
      ? `${host}/biz/${manateeUrl}/project${projectId}/${moduleCode}`
      : `/biz/${manateeUrl}/project${projectId}/${moduleCode}`;

    // 构建参数字段列表
    const params: ModuleParamField[] = [];

    // 1. 从 paramVerify 提取规则
    if (parsed.paramVerify && Object.keys(parsed.paramVerify).length > 0) {
      for (const [key, val] of Object.entries(parsed.paramVerify)) {
        // 从 post/get 示例中推断类型和示例值
        const exampleVal = parsed.post?.[key] ?? parsed.get?.[key];
        let type = "string";
        if (exampleVal !== undefined) {
          type = Array.isArray(exampleVal) ? "array" : typeof exampleVal;
        }

        params.push({
          name: key,
          type,
          required: val.required === true,
          description: val.description,
          example: exampleVal,
        });
      }
    }

    // 2. 如果 paramVerify 为空，从 post/get 示例直接提取
    if (params.length === 0) {
      const exampleData = parsed.post || parsed.get || {};
      for (const [key, val] of Object.entries(exampleData)) {
        const type = Array.isArray(val) ? "array" : typeof val;
        params.push({
          name: key,
          type,
          required: true, // 无校验规则时默认必填
          example: val,
        });
      }
    }

    return {
      moduleCode: mod.moduleCode,
      moduleName: mod.moduleName,
      description: mod.moduleDescription,
      requestMode: mod.requestMode,
      host: parsed.host || mod.host,
      headers: parsed.headers || [],
      path,
      params,
      requestExample: parsed.post || parsed.get,
      processConf: mod.processConf,
      docUrl: mod?.docUrl,
    };
  }

  // ---------- Markdown 渲染 ----------

 private renderModuleListMarkdown(
  modules: FlattenedModule[],
  total: number,
  limit: number,
  filters: { keyword?: string; groupPath?: string }
): string {
  const lines = [
    "# 海牛业务接口索引",
    "",
    "这是第一步的轻量索引，只用于选择业务模块；接口入参、出参、调用方式请在第二步调用 `get_api_detail` 查询。",
    "",
    "## 概念",
    "",
    "- `moduleId`：模块唯一 ID（数字），**查询详情时必须使用此 ID**。",
    "- `moduleCode`：模块编码，人类可读的标识。",
    "- `requestMode`：请求方式，通常为 POST。",
    "",
    "## 第二步查询方式",
    "",
    "- 查询单个接口详情：`get_api_detail({ moduleId: \"1777384111665001\" })`",
    "- 批量查询：`get_api_detail({ moduleIds: [\"1777384111665001\", \"1777384111688001\"] })`",
    "",
    `当前过滤：keyword=${filters.keyword || "无"}, groupPath=${filters.groupPath || "全部"}, 共 ${total} 个模块，展示前 ${Math.min(total, limit)} 个`,
    "",
  ];

  const grouped = new Map<string, FlattenedModule[]>();
  for (const m of modules) {
    const simplifiedPath = this.simplifyGroupPath(m.path);
    const list = grouped.get(simplifiedPath) || [];
    list.push(m);
    grouped.set(simplifiedPath, list);
  }

  const sortedGroups = Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));

  for (const [group, items] of sortedGroups) {
    lines.push(`## ${group}`);
    lines.push("");

    for (const item of items) {
      const mod = item.node.module!;
      lines.push(`- **${mod.moduleName}** | ${mod.moduleCode} | ID: ${item.moduleId} | ${mod.requestMode}`);
      if (mod.moduleDescription) {
        lines.push(` - 描述:${mod.moduleDescription}`);
      }
    }
    lines.push("");
  }

  if (total > limit) {
    lines.push(`> 已截断，仅展示前 ${limit} 条。如需更多，请调整 keyword 或 groupPath 参数。`);
    lines.push("");
  }

  return lines.join("\n");
}
  private simplifyGroupPath(fullPath: string): string {
    // 去掉常见的包名前缀，保留业务语义路径
    // 例如：manatee-skill-test/com/manatee/ordersystem/controller/OrderController
    // 简化为：ordersystem/controller/OrderController
    const parts = fullPath.split("/");
    const skipList = new Set(["com", "manatee", "java", "org", "cn"]);
    const filtered = parts.filter((p, idx) => {
      if (idx === 0 && p.includes("manatee")) return false; // 去掉根项目名
      if (skipList.has(p.toLowerCase())) return false;
      return true;
    });
    return filtered.join("/") || fullPath;
  }

  private renderModuleFetchExample(detail: ModuleApiDetail, config: ManateeRuntimeConfig): string {
    const url = detail.path;
    const requestMode = detail.requestMode.toUpperCase();

    let code = `// ${detail.moduleName}\n`;
    code += `// 模块编码: ${detail.moduleCode}\n`;
    code += `const url = '${url}';\n\n`;

    code += `// 请求头\n`;
    code += `const headers = {\n`;
    code += `  Token: '${config.apiKey}',\n`;
    code += `  'Content-Type': 'application/json',\n`;
    if (config.workspaceHeader) {
      code += `  'x-workspace-view': '${config.workspaceHeader}',\n`;
    }
    if (detail.headers?.length) {
      for (const h of detail.headers) {
        code += `  '${h.KEY}': '${h.VALUE}',\n`;
      }
    }
    code += `};\n\n`;

    if (requestMode === "GET") {
      if (detail.requestExample) {
        code += `const params = ${JSON.stringify(detail.requestExample, null, 2)};\n\n`;
        code += `const response = await axios.get(url, { headers, params });\n`;
      } else {
        code += `const response = await axios.get(url, { headers });\n`;
      }
    } else {
      const requestData = detail.requestExample || {};
      code += `const data = ${JSON.stringify(requestData, null, 2)};\n\n`;
      code += `const response = await axios.post(url, data, { headers });\n`;
    }

    code += `\n// 提取数据\n`;
    code += `return response.data;`;

    return code;
  }

  private renderModuleDetailMarkdown(details: ModuleApiDetail[], config: ManateeRuntimeConfig): string {
    const lines = [
      "# 海牛接口详情",
      "",
      `域名：${config.baseUrl}`,
      "",
      "实际调用时请使用下方提供的完整 URL 和请求头",
      "",
      "## 调用示例",
      "",
      "```js",
      this.renderModuleFetchExample(details[0], config),
      "```",
      "",
    ];

    for (const detail of details) {
      lines.push(`## ${detail.moduleCode}`);
      lines.push("");
      lines.push(`**模块名称**：${detail.moduleName}`);
      lines.push(`**请求方式**：${detail.requestMode}`);
      if (detail.description) {
        lines.push(`**描述**：${detail.description}`);
      }
      if (detail.host) {
        lines.push(`**目标服务**：${detail.host}`);
      }
      if (detail.docUrl) {
        lines.push(`**文档地址**：${detail.docUrl}`);
      }
      lines.push("");

      // 请求头表格
      if (detail.headers.length > 0) {
        lines.push("### 固定请求头");
        lines.push("");
        lines.push("| Key | Value | 说明 |");
        lines.push("|-----|-------|------|");
        for (const h of detail.headers) {
          lines.push(`| ${h.KEY} | ${h.VALUE} | ${h.DESC || "-"} |`);
        }
        lines.push("");
      }

      // 参数表格
      lines.push("### 参数列表");
      lines.push("");
      lines.push("| 参数名 | 类型 | 必填 | 说明 | 示例 |");
      lines.push("|--------|------|------|------|------|");
      for (const p of detail.params) {
        const exampleStr = p.example !== undefined ? `\`${JSON.stringify(p.example)}\`` : "-";
        lines.push(`| ${p.name} | ${p.type} | ${p.required ? "是" : "否"} | ${p.description || "-"} | ${exampleStr} |`);
      }
      lines.push("");

      // 请求示例
      if (detail.requestExample) {
        lines.push("### 请求示例");
        lines.push("");
        lines.push("```json");
        lines.push(JSON.stringify(detail.requestExample, null, 2));
        lines.push("```");
        lines.push("");
      }

      // 完整 JSON
      lines.push("### 完整定义");
      lines.push("");
      lines.push("```json");
      lines.push(JSON.stringify(detail, null, 2));
      lines.push("```");
      lines.push("");
    }

    return lines.join("\n");
  }

  // ---------- AI Tools 生成 ----------

  createTools() {
    return [this.createApiListTool(), this.createApiDetailTool()];
  }

  private createApiListTool() {
    const self = this;

    return {
      name: "get_api_list",
      title: "查询海牛接口列表",
      description:
        "获取海牛项目下的所有业务模块（接口）列表，包含模块编码、名称、请求方式及分组路径。拿到 moduleCode 后可用于 get_api_detail 查询接口详情。支持按关键字和分组路径过滤。",
      parameters: {
        type: "object",
        properties: {
          keyword: {
            type: "string",
            description: "按模块名称或编码模糊搜索，例如输入 'order' 会匹配 api_order_create、api_order_list 等",
          },
          groupPath: {
            type: "string",
            description: "按分组路径过滤，例如 'ordersystem/controller'、'OrderController'",
          },
          limit: {
            type: "integer",
            description: "最多返回多少条模块，默认 50，最大 200",
            default: 50,
            maximum: 200,
          },
        },
        required: [],
      },
      async execute(
        params: { keyword?: string; groupPath?: string; limit?: number } = {}
      ): Promise<{ output: string; metadata: Record<string, any> }> {

        // 获取模块树
        const tree = await self.fetchModuleTree();
        let modules = self.flattenModuleTree(tree);

        // 过滤
        const filters: { keyword?: string; groupPath?: string } = {};
        if (params.keyword) {
          const kw = params.keyword.toLowerCase();
          modules = modules.filter((m) => {
            return [
              m.node.module?.moduleCode,
              m.node.module?.moduleName,
              m.node.module?.moduleDescription,
              m.path,
            ].some(
              (field) => typeof field === "string" && field.toLowerCase().includes(kw),
            );
          });
          filters.keyword = params.keyword;
        }

        if (params.groupPath) {
          const gp = params.groupPath.toLowerCase();
          modules = modules.filter((m) => m.path.toLowerCase().includes(gp));
          filters.groupPath = params.groupPath;
        }

        const total = modules.length;
        const limit = Math.min(Math.max(params.limit || 50, 1), 200);
        modules = modules.slice(0, limit);

        return {
          output: self.renderModuleListMarkdown(modules, total, limit, filters),
          metadata: {
            total,
            returned: modules.length,
            limit,
            domains: Array.from(new Set(modules.map((m) => self.simplifyGroupPath(m.path)))).sort(),
          },
        };
      },
    };
  }

 private createApiDetailTool() {
  const self = this;

  return {
    name: "get_api_detail",
    title: "查询海牛接口详情",
    description:
      "根据 moduleId（模块唯一 ID）查询海牛业务接口的详细参数定义、请求方式和调用示例。支持单个 moduleId 或批量 moduleIds。",
    parameters: {
      type: "object",
      properties: {
        moduleId: {
          type: "string",
          description: "单个模块 ID，来自 get_api_list，例如 1777384111665001",
        },
        moduleIds: {
          type: "array",
          items: { type: "string" },
          description: "批量模块 ID，例如 [\"1777384111665001\", \"1777384111688001\"]",
        },
      },
      required: [],
    },
    async execute(params: { moduleId?: string; moduleIds?: string[] } = {}) {
      const config = self.getRuntimeConfig();

      // 解析请求
      const ids: string[] = [];
      if (params.moduleIds?.length) {
        ids.push(...params.moduleIds);
      } else if (params.moduleId) {
        ids.push(params.moduleId);
      } else {
        throw new Error("请提供 moduleId 或 moduleIds");
      }

      const uniqueIds = Array.from(new Set(ids));

      // 批量获取详情
      const details = await Promise.all(
        uniqueIds.map(async (id) => {
          const raw = await self.fetchModuleDetail(id);
          return self.buildModuleApiDetail(raw);
        })
      );

      return {
        output: self.renderModuleDetailMarkdown(details, config),
        metadata: {
          moduleIds: uniqueIds,
          count: uniqueIds.length,
        },
      };
    },
  };
}
}

// 兼容旧版 API 的工厂函数
export function createManateeTools(getConfig: GetManateeConfig) {
  const connector = new ManateeConnector(getConfig);
  return connector.createTools();
}

export function setupManateeAxiosInterceptor(getConfig: GetManateeConfig): ManateeConnector {
  return new ManateeConnector(getConfig);
}