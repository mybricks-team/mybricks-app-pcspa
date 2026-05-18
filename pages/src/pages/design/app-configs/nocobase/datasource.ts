import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";

type NocobaseRuntimeConfig = {
  baseUrl: string;
  apiKey: string;
  authHeader: string;
  spacesViewHeader?: string;
};

export const NOCOBASE_ALL_SPACE_VALUE = "__all__";

export type NocobaseSpaceOption = {
  name: string;
  title?: string;
};

type NocobaseConfig = {
  domain?: string;
  apiKey?: string;
  token?: string;
  spaceName?: string;
};

type GetNocobaseConfig = () => NocobaseConfig | undefined;

const MYBRICKS_PROXY_HOST = "my.mybricks.world";
const MYBRICKS_PROXY_PATH = "/paas/api/proxy";
let axiosInterceptorInstalled = false;
let currentGetConfig: GetNocobaseConfig | null = null;
let currentNocobaseSpaces: NocobaseSpaceOption[] = [];

function normalizeBaseUrl(domain = "") {
  return domain.trim().replace(/\/+$/, "");
}

function shouldUseMybricksProxy() {
  return typeof window !== "undefined" && window.location?.hostname === MYBRICKS_PROXY_HOST;
}

function resolveAxiosRequestUrl(config: AxiosRequestConfig) {
  const url = config.url || "";

  try {
    return new URL(url).href;
  } catch {
    return "";
  }
}

function isNocobaseAxiosRequest(config: AxiosRequestConfig, baseUrl: string) {
  const requestUrl = resolveAxiosRequestUrl(config);
  if (!requestUrl) return false;

  try {
    const request = new URL(requestUrl);
    const target = new URL(baseUrl);

    return request.origin === target.origin && request.pathname.startsWith(target.pathname);
  } catch {
    return false;
  }
}

function setAxiosHeader(requestConfig: InternalAxiosRequestConfig, name: string, value: string) {
  const headers = requestConfig.headers as any;

  if (headers?.set) {
    headers.set(name, value);
    return;
  }

  requestConfig.headers = {
    ...headers,
    [name]: value,
  } as any;
}

function setAxiosAuthorizationHeader(requestConfig: InternalAxiosRequestConfig, apiKey: string) {
  setAxiosHeader(requestConfig, "Authorization", `Bearer ${apiKey}`);
}

export function getNocobaseSpacesViewHeader(config: NocobaseConfig = {}) {
  const spaces = currentNocobaseSpaces
    .map((space) => space.name?.trim?.() || "")
    .filter(Boolean);

  if (spaces.length === 0) {
    return "";
  }

  const selectedSpaceName = config.spaceName || NOCOBASE_ALL_SPACE_VALUE;
  if (selectedSpaceName === NOCOBASE_ALL_SPACE_VALUE) {
    return spaces.join(",");
  }

  return spaces.includes(selectedSpaceName) ? selectedSpaceName : spaces.join(",");
}

export function setCurrentNocobaseSpaces(spaces: NocobaseSpaceOption[]) {
  currentNocobaseSpaces = spaces;
}

export function clearCurrentNocobaseSpaces() {
  currentNocobaseSpaces = [];
}

function applyNocobaseAxiosConfig(requestConfig: InternalAxiosRequestConfig) {
  const config = currentGetConfig?.() || {};
  const baseUrl = normalizeBaseUrl(config.domain);
  const apiKey = config.apiKey?.trim?.() || config.token?.trim?.() || "";
  const requestUrl = resolveAxiosRequestUrl(requestConfig);
  const matched = Boolean(baseUrl && isNocobaseAxiosRequest(requestConfig, baseUrl));

  if (!baseUrl || !apiKey || !matched) {
    return requestConfig;
  }

  requestConfig.withCredentials = false;
  setAxiosAuthorizationHeader(requestConfig, apiKey);
  const spacesViewHeader = getNocobaseSpacesViewHeader(config);

  if (spacesViewHeader) {
    setAxiosHeader(requestConfig, "x-spaces-view", spacesViewHeader);
  }

  return requestConfig;
}

function installNocobaseAxiosCreateInterceptor() {
  if (axiosInterceptorInstalled) {
    return;
  }

  axiosInterceptorInstalled = true;
  const originalCreate = axios.create.bind(axios);

  axios.create = ((...args: Parameters<typeof axios.create>) => {
    const instance = originalCreate(...args);
    instance.interceptors.request.use(applyNocobaseAxiosConfig);
    return instance;
  }) as typeof axios.create;
}

installNocobaseAxiosCreateInterceptor();

export function setupNocobaseAxiosInterceptor(getConfig: GetNocobaseConfig) {
  currentGetConfig = getConfig;
}

export function createNocobaseFetchRequest(targetUrl: string, apiKey: string, spacesViewHeader?: string) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
  };

  if (spacesViewHeader) {
    headers["x-spaces-view"] = spacesViewHeader;
  }

  if (shouldUseMybricksProxy()) {
    headers["X-Target-Url"] = targetUrl;

    return {
      url: MYBRICKS_PROXY_PATH,
      init: { headers },
    };
  }

  return {
    url: targetUrl,
    init: { headers },
  };
}

function getNocobaseRuntimeConfig(getConfig: GetNocobaseConfig): NocobaseRuntimeConfig {
  const config = getConfig?.() || {};
  const baseUrl = normalizeBaseUrl(config.domain);
  const apiKey = config.apiKey?.trim?.() || config.token?.trim?.() || "";

  if (!baseUrl || !apiKey) {
    throw new Error("请先在「连接nocobase」插件中配置域名和 API Key");
  }

  return {
    baseUrl,
    apiKey,
    authHeader: `Authorization: Bearer ${apiKey}`,
    spacesViewHeader: getNocobaseSpacesViewHeader(config),
  };
}

const AUDIT_FIELD_NAMES = new Set([
  "createdAt",
  "createdBy",
  "updatedAt",
  "updatedBy",
]);

const CONTEXT_FIELD_NAMES = new Set([
  "createdById",
  "updatedById",
  "spaceName",
]);

const SYSTEM_COLLECTION_NAMES = new Set([
  "roles",
  "rolesResourcesScopes",
  "dataSourcesRoles",
  "dataSourcesRolesResources",
  "dataSourcesRolesResourcesScopes",
  "apiKeys",
  "authenticators",
  "collections",
  "collectionCategories",
  "fields",
  "uiSchemas",
  "desktopRoutes",
  "mobileRoutes",
  "dataSources",
  "dataSourcesCollections",
  "workflows",
  "flow_nodes",
  "flowSurfaces",
  "executions",
  "jobs",
  "backups",
  "storages",
  "verifications",
  "verifications_providers",
  "migration",
  "migrationLogs",
  "migrationRules",
  "migrationRule",
  "themeConfig",
  "localizationTexts",
  "localizationTranslations",
  "mailMessages",
  "mailMessageLabels",
  "mailmessagelabelsMailmessagesRel",
  "recordHistories",
  "recordFieldHistories",
  "asset_assignments",
  "asset_categories",
  "asset_maintenances",
  "asset_returns",
  "assets",
]);

const SYSTEM_COLLECTION_PATTERNS = [
  /^roles[._-]/,
  /^dataSources[._-]/,
  /^uiSchemas[._-]/,
  /^migration/i,
  /^verifications?[._-]/,
  /^authenticators?[._-]/,
  /^mailMessage/i,
  /^record(Field)?Histor/i,
  /^asset_/,
];

const BUSINESS_DOMAIN_RULES: Array<{ domain: string; patterns: RegExp[] }> = [
  { domain: "crm", patterns: [/customers?/, /contacts?/, /leads?/] },
  { domain: "sales", patterns: [/quotations?/, /orders?/, /payments?/, /invoices?/] },
  { domain: "product", patterns: [/products?/] },
  { domain: "project", patterns: [/projects?/, /tasks?/, /milestones?/] },
  { domain: "ticket", patterns: [/tickets?/, /knowledge/] },
  { domain: "hr", patterns: [/departments?/, /positions?/, /employee_/, /leave_requests?/] },
  { domain: "dictionary", patterns: [/categories?/, /countries?/, /tags?/] },
];

const COLLECTION_ACTIONS = ["list", "get", "create", "update", "destroy", "export"] as const;

type CollectionAction = typeof COLLECTION_ACTIONS[number];
type RelationAction = "list" | "get" | "add" | "remove" | "set";

type FieldMeta = {
  name: string;
  type?: string;
  interface?: string;
  target?: string;
  foreignKey?: string;
  sourceKey?: string;
  targetKey?: string;
  primaryKey?: boolean;
  allowNull?: boolean;
  uiSchema?: {
    title?: string;
  };
};

type CollectionMeta = {
  name: string;
  title?: string;
  description?: string;
  template?: string;
  hidden?: boolean;
  filterTargetKey?: string;
  titleField?: string;
  fields?: FieldMeta[];
};

type ApiListParams = {
  includeSystem?: boolean;
};

type ApiDetailParams = {
  apiId?: string;
  apiIds?: string[];
  collection?: string;
  action?: CollectionAction | RelationAction;
  relation?: string;
  includeSystem?: boolean;
};

function getFieldTitle(field: FieldMeta): string | undefined {
  return field.uiSchema?.title;
}

function isSystemCollection(collection: CollectionMeta): boolean {
  if (SYSTEM_COLLECTION_NAMES.has(collection.name)) return true;
  if (collection.hidden) return true;
  return SYSTEM_COLLECTION_PATTERNS.some((pattern) => pattern.test(collection.name));
}

function inferDomain(collectionName: string): string {
  for (const rule of BUSINESS_DOMAIN_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(collectionName))) {
      return rule.domain;
    }
  }
  return "business";
}

function isSystemGeneratedField(field: FieldMeta): boolean {
  return Boolean(
    field.primaryKey ||
      field.type === "snowflakeId" ||
      field.type === "sequence" ||
      AUDIT_FIELD_NAMES.has(field.name) ||
      CONTEXT_FIELD_NAMES.has(field.name) ||
      field.interface === "createdAt" ||
      field.interface === "updatedAt" ||
      field.interface === "createdBy" ||
      field.interface === "updatedBy" ||
      field.interface === "space" ||
      field.type === "context"
  );
}

function methodForAction(action: CollectionAction | RelationAction): "GET" | "POST" {
  return action === "list" || action === "get" || action === "export" ? "GET" : "POST";
}

function relationActions(field: FieldMeta): RelationAction[] {
  if (field.type === "hasMany" || field.type === "belongsToMany") {
    return ["list", "add", "remove", "set"];
  }
  return ["get", "set", "remove"];
}

function collectionPath(collection: string, action: CollectionAction): string {
  return `/api/${collection}:${action}`;
}

function relationPath(collection: string, relation: string, action: RelationAction): string {
  return `/api/${collection}/{id}/${relation}:${action}`;
}

function fieldToJsonSchema(field: FieldMeta): Record<string, any> {
  const base: Record<string, any> = {};

  switch (field.type) {
    case "bigInt":
    case "integer":
    case "sort":
      return { ...base, type: "integer" };
    case "double":
    case "float":
    case "decimal":
      return { ...base, type: "number" };
    case "boolean":
      return { ...base, type: "boolean" };
    case "json":
      return { ...base, type: "object" };
    case "array":
    case "set":
      return { ...base, type: "array", items: {} };
    case "date":
      return { ...base, type: "string", format: "date-time" };
    case "dateOnly":
      return { ...base, type: "string", format: "date" };
    default:
      return { ...base, type: "string" };
  }
}

function getRelations(collection: CollectionMeta): FieldMeta[] {
  return (collection.fields ?? []).filter((field) => field.target && !isSystemGeneratedField(field));
}

function renderApiListMarkdown(collections: CollectionMeta[], params: ApiListParams) {
  const grouped = new Map<string, CollectionMeta[]>();

  for (const collection of collections) {
    const domain = inferDomain(collection.name);
    grouped.set(domain, [...(grouped.get(domain) ?? []), collection]);
  }

  const lines = [
    "# NocoBase 业务接口索引",
    "",
    "这是第一步的轻量索引，只用于选择业务对象和关系；接口入参、出参、method、path 请在第二步调用 `get_api_detail` 查询。",
    "",
    "## 概念",
    "",
    "- `collection`：业务数据集合，等价于一个业务对象或数据表，例如 `customers`、`orders`。",
    "- `relation`：某个 collection 上的关联字段，表示它和另一个 collection 的关系，例如 `orders.items -> order_items`。",
    "- `action`：要执行的接口动作。collection 常用 `list/get/create/update/destroy/export`；relation 动作不要在本索引里展开，需要详情时再指定。",
    "",
    "## 第二步查询方式",
    "",
    "- 查询 collection 接口详情：`get_api_detail({ apiId: \"{collection}.{action}\" })`",
    "- 查询 relation 接口详情：`get_api_detail({ collection: \"{collection}\", relation: \"{relation}\", action: \"list\" })`",
    "- 批量查询详情：`get_api_detail({ apiIds: [\"customers.list\", \"orders.list\"] })`",
    "",
    "常用示例：",
    "- `customers.list`",
    "- `customers.create`",
    "- `get_api_detail({ collection: \"orders\", relation: \"items\", action: \"list\" })`",
    "",
    `当前过滤：includeSystem=${params.includeSystem === true}`,
    "",
  ];

  for (const [domain, domainCollections] of Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`## ${domain}`);
    lines.push("");

    for (const collection of domainCollections) {
      const fields = collection.fields ?? [];
      const scalarFields = fields.filter((field) => !field.target && !isSystemGeneratedField(field));
      const relations = getRelations(collection);
      const title = collection.title && collection.title !== collection.name ? ` - ${collection.title}` : "";
      const titleField = collection.titleField ? `；标题字段：${collection.titleField}` : "";
      const relationText = relations.length > 0
        ? `；relations：${relations.slice(0, 8).map((field) => `${field.name}->${field.target}`).join(", ")}${relations.length > 8 ? "..." : ""}`
        : "";
      const fieldText = scalarFields.length > 0
        ? `；字段：${scalarFields.slice(0, 8).map((field) => field.name).join(", ")}${scalarFields.length > 8 ? "..." : ""}`
        : "";

      lines.push(`- \`${collection.name}\`${title}${titleField}${fieldText}${relationText}`);
    }

    lines.push("");
  }

  return lines.join("\n");
}

function parseApiId(apiId: string): Pick<ApiDetailParams, "collection" | "relation" | "action"> {
  const parts = apiId.split(".");
  if (parts.length === 2) {
    return { collection: parts[0], action: parts[1] as CollectionAction };
  }
  if (parts.length === 3) {
    return { collection: parts[0], relation: parts[1], action: parts[2] as RelationAction };
  }
  throw new Error(`apiId 格式错误：${apiId}。示例：customers.list 或 customers.contacts.list`);
}

function getDetailRequests(params: ApiDetailParams): Array<Pick<ApiDetailParams, "collection" | "relation" | "action">> {
  if (params.apiIds?.length) {
    return params.apiIds.map(parseApiId);
  }
  if (params.apiId) {
    return [parseApiId(params.apiId)];
  }
  return [{
    collection: params.collection,
    relation: params.relation,
    action: params.action,
  }];
}

function buildCommonQueryParameters() {
  return [
    { name: "filter", type: "object", description: "NocoBase JSON filter" },
    { name: "fields", type: "string", description: "返回字段，例如 id,name,status" },
    { name: "appends", type: "string", description: "展开关联，例如 customer,items" },
    { name: "except", type: "string", description: "排除字段" },
    { name: "page", type: "integer", description: "页码" },
    { name: "pageSize", type: "integer", description: "每页数量" },
    { name: "sort", type: "string", description: "排序，例如 -createdAt,name" },
  ];
}

function compactField(field: FieldMeta) {
  const schema = fieldToJsonSchema(field);
  const readOnly = isSystemGeneratedField(field) || Boolean(field.target);

  return {
    name: field.name,
    title: getFieldTitle(field),
    type: schema.type,
    format: schema.format,
    required: field.allowNull === false && !readOnly ? true : undefined,
    readOnly: readOnly ? true : undefined,
    relation: field.target
      ? {
          type: field.type,
          target: field.target,
          foreignKey: field.foreignKey,
          sourceKey: field.sourceKey,
          targetKey: field.targetKey,
        }
      : undefined,
  };
}

function getWritableFields(collection: CollectionMeta) {
  return (collection.fields ?? [])
    .filter((field) => !field.target && field.type !== "context" && !isSystemGeneratedField(field))
    .map(compactField);
}

function getResponseFields(collection: CollectionMeta) {
  return (collection.fields ?? [])
    .filter((field) => field.type !== "context")
    .map(compactField);
}

function buildDetail(
  collection: CollectionMeta,
  params: Required<Pick<ApiDetailParams, "action">> & Pick<ApiDetailParams, "relation">
) {
  const action = params.action;
  const primaryKey = (collection.fields ?? []).find((field) => field.primaryKey)?.name ?? collection.filterTargetKey ?? "id";
  const relation = params.relation
    ? getRelations(collection).find((field) => field.name === params.relation)
    : undefined;

  if (params.relation && !relation) {
    throw new Error(`未找到关联接口：${collection.name}.${params.relation}`);
  }

  const isRelation = Boolean(relation);
  if (isRelation && !relationActions(relation!).includes(action as RelationAction)) {
    throw new Error(`关联接口动作不支持：${collection.name}.${relation!.name}.${action}`);
  }
  if (!isRelation && !COLLECTION_ACTIONS.includes(action as CollectionAction)) {
    throw new Error(`集合接口动作不支持：${collection.name}.${action}`);
  }

  const path = isRelation
    ? relationPath(collection.name, relation!.name, action as RelationAction)
    : collectionPath(collection.name, action as CollectionAction);
  const method = methodForAction(action);
  const responseItemTitle = isRelation ? relation!.target : collection.name;
  const responseIsList = action === "list";
  const pathParams = isRelation
    ? [{ name: "id", type: "string", required: true, description: `${collection.name} ${primaryKey}` }]
    : undefined;
  const query = [
    ...((action === "list" || action === "get") ? buildCommonQueryParameters() : []),
    ...(!isRelation && action !== "create" && action !== "list"
      ? [{ name: "filterByTk", type: "string", description: `记录主键，通常是 ${primaryKey}` }]
      : []),
  ];

  return {
    apiId: isRelation
      ? `${collection.name}.${relation!.name}.${action}`
      : `${collection.name}.${action}`,
    path,
    method,
    description: isRelation
      ? `${collection.name}.${relation!.name} 关联接口，目标 collection：${relation!.target}`
      : `${collection.title ?? collection.name} collection 接口`,
    pathParams,
    query: query.length > 0 ? query : undefined,
    body: method === "POST" && action !== "destroy" && action !== "remove"
      ? isRelation
        ? {
            values: {
              type: "string[]",
              description: `关联目标 ${relation!.target} 的主键列表`,
            },
          }
        : {
            fields: getWritableFields(collection),
          }
      : undefined,
    response: {
      data: responseIsList ? `${responseItemTitle}[]` : responseItemTitle,
      meta: responseIsList ? ["count", "page", "pageSize", "totalPage"] : undefined,
    },
    collection: {
      name: collection.name,
      title: collection.title,
      primaryKey,
      titleField: collection.titleField,
    },
    relation: relation
      ? {
          name: relation.name,
          title: getFieldTitle(relation),
          type: relation.type,
          target: relation.target,
          foreignKey: relation.foreignKey,
          sourceKey: relation.sourceKey,
          targetKey: relation.targetKey,
        }
      : undefined,
    fields: getResponseFields(collection),
  };
}

function renderFetchExample(detail: ReturnType<typeof buildDetail>, config: NocobaseRuntimeConfig) {
  return `
class MyDatasource extends DataSource {
  async query({ username, password }) {
    return this.axios.get('${config.baseUrl}/api/xxx', {
      params: { id: 'xxx' }
    }).then(res => { // 格式化并提取有效数据，这里拿到的是axios的返回，本身有一层data
      if (res?.data) {
        return res.data?.data?.meta
      }
    });
  }
}
`;
}

function renderApiDetailMarkdown(details: Array<ReturnType<typeof buildDetail>>, config: NocobaseRuntimeConfig) {
  const lines = [
    "# NocoBase 接口详情",
    "",
    `域名：${config.baseUrl}`,
    "",
    "实际调用时必须使用域名拼接为完整 URL",
    "",
    "## 调用示例",
    "",
    "```js",
    renderFetchExample(details[0], config),
    "```",
    "",
  ];

  for (const detail of details) {
    lines.push(`## ${detail.apiId}`);
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(detail, null, 2));
    lines.push("```");
    lines.push("");
  }

  return lines.join("\n");
}

async function fetchCollectionsMeta(config: NocobaseRuntimeConfig): Promise<CollectionMeta[]> {
  const targetUrl = `${config.baseUrl}/api/collections:listMeta`;
  const request = createNocobaseFetchRequest(targetUrl, config.apiKey, config.spacesViewHeader);
  let response: Response;

  try {
    response = await fetch(request.url, request.init);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`NocoBase collections:listMeta 调用失败：${reason}。请确认左侧「连接nocobase」插件配置了正确的域名和 API Key。`);
  }

  if (!response.ok) {
    let responseText = "";

    try {
      responseText = await response.text();
    } catch {
      responseText = "";
    }

    const detail = responseText ? `，响应：${responseText.slice(0, 300)}` : "";
    throw new Error(
      `NocoBase collections:listMeta 请求失败：HTTP ${response.status} ${response.statusText}${detail}。请确认左侧「连接nocobase」插件配置了正确的域名和 API Key。`
    );
  }

  let body: any;

  try {
    body = await response.json();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`NocoBase collections:listMeta 返回内容解析失败：${reason}。请确认 NocoBase 服务可正常访问。`);
  }

  if (!Array.isArray(body?.data)) {
    throw new Error("NocoBase collections:listMeta 返回格式异常：缺少 data 数组。请确认当前域名对应的是 NocoBase 服务。");
  }

  return body.data;
}

function filterCollections(collections: CollectionMeta[], params: ApiListParams | ApiDetailParams) {
  const includeSystem = params.includeSystem === true;

  return collections
    .filter((collection) => includeSystem || !isSystemCollection(collection))
    .sort((a, b) => inferDomain(a.name).localeCompare(inferDomain(b.name)) || a.name.localeCompare(b.name));
}

function assertMeaningfulBusinessCollections(collections: CollectionMeta[], config: NocobaseRuntimeConfig) {
  const businessCollections = filterCollections(collections, {});
  const collectionsWithFields = businessCollections.filter((collection) =>
    (collection.fields ?? []).some((field) => !isSystemGeneratedField(field) && !field.target)
  );

  if (businessCollections.length === 0) {
    throw new Error(
      `NocoBase 数据源初始化失败：已连接 ${config.baseUrl}，但系统黑名单过滤后没有发现业务 collection。请检查域名、API Key 或黑名单配置。`
    );
  }

  if (collectionsWithFields.length === 0) {
    throw new Error(
      `NocoBase 数据源初始化失败：已连接 ${config.baseUrl}，但没有发现包含业务字段的 collection。无法生成有意义的接口 tools。`
    );
  }

  return businessCollections;
}

function createApiListTool(getConfig: GetNocobaseConfig) {
  return {
    name: "get_api_list",
    title: "查询 NocoBase 接口列表",
    description:
      "获取关联的 NocoBase 项目的接口列表。拿到可用的业务相关的接口列表，获取的内容包含 apiId，可用于 get_api_detail 查询接口详情。",
    parameters: {
      type: "object",
      properties: {
        includeSystem: {
          type: "boolean",
          description: "是否包含系统 collection。默认 false，不建议开启",
          default: false,
        },
      },
      required: [],
    },
    async execute(params: ApiListParams = {}): Promise<{ output: string; metadata: Record<string, any> }> {
      const config = getNocobaseRuntimeConfig(getConfig);
      const sourceCollections = await fetchCollectionsMeta(config);
      assertMeaningfulBusinessCollections(sourceCollections, config);
      const collections = filterCollections(sourceCollections, params);

      return {
        output: renderApiListMarkdown(collections, params),
        metadata: {
          collectionCount: collections.length,
          domains: Array.from(new Set(collections.map((collection) => inferDomain(collection.name)))).sort(),
        },
      };
    },
  };
}

function createApiDetailTool(getConfig: GetNocobaseConfig) {
  return {
    name: "get_api_detail",
    title: "查询 NocoBase 接口详情",
    description:
      "根据 get_api_list 的索引获取业务接口详情，支持单个 apiId 或批量 apiIds，读取业务字段元数据，返回 Markdown 格式的域名、Token 和接口 JSON 代码块。",
    parameters: {
      type: "object",
      properties: {
        apiId: {
          type: "string",
          description: "单个接口 ID，来自 get_api_list，例如 customers.list。批量查询时使用 apiIds",
        },
        apiIds: {
          type: "array",
          items: { type: "string" },
          description: "批量接口 ID，例如 [\"customers.list\", \"orders.list\", \"orders.items.list\"]",
        },
        collection: {
          type: "string",
          description: "collection 名称，例如 customers、orders。建议先调用 get_api_list 查看当前系统有哪些 collection。",
        },
        relation: {
          type: "string",
          description: "可选，关联字段名，例如 contacts/items。用于查询关系接口详情。",
        },
        action: {
          type: "string",
          enum: ["list", "get", "create", "update", "destroy", "export", "add", "remove", "set"],
          description: "接口动作。collection 支持 list/get/create/update/destroy/export；relation 支持 list/get/add/remove/set",
        },
        includeSystem: {
          type: "boolean",
          description: "是否允许查询系统 collection。默认 false",
          default: false,
        },
      },
      required: [],
    },
    async execute(params: ApiDetailParams = {}): Promise<{ output: string; metadata: Record<string, any> }> {
      const config = getNocobaseRuntimeConfig(getConfig);
      const requests = getDetailRequests(params);

      const sourceCollections = await fetchCollectionsMeta(config);
      assertMeaningfulBusinessCollections(sourceCollections, config);
      const collections = filterCollections(sourceCollections, {
        includeSystem: params.includeSystem,
      });
      const details = requests.map((request) => {
        const collectionName = request.collection;
        const action = request.action;

        if (!collectionName || !action) {
          throw new Error("请提供 apiId/apiIds，或同时提供 collection 和 action");
        }

        const collection = collections.find((item) => item.name === collectionName);
        if (!collection) {
          throw new Error(`未找到业务 collection：${collectionName}`);
        }

        return buildDetail(collection, {
          action,
          relation: request.relation,
        });
      });

      return {
        output: renderApiDetailMarkdown(details, config),
        metadata: {
          apiIds: details.map((detail) => detail.apiId),
          count: details.length,
        },
      };
    },
  };
}

/**
 * 数据源插件
 *
 * 提供两级业务接口查询：
 * 1. get_api_list：先拿业务接口索引
 * 2. get_api_detail：再按 apiId 拿单个接口的入参出参
 */
export function createNocobaseTools(getConfig: GetNocobaseConfig) {
  return [createApiListTool(getConfig), createApiDetailTool(getConfig)];
}
