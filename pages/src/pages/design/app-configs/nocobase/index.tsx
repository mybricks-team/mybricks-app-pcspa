import React, { useEffect, useState } from "react";
import { KeyOutlined, LinkOutlined } from "@ant-design/icons";

import {
  clearCurrentNocobaseSpaces,
  createNocobaseFetchRequest,
  createNocobaseTools,
  getNocobaseSpacesViewHeader,
  NOCOBASE_ALL_SPACE_VALUE,
  setCurrentNocobaseSpaces,
  setupNocobaseAxiosInterceptor,
} from "./datasource";
import type { NocobaseSpaceOption } from "./datasource";
import styles from "./index.less";

const PLUGIN_NAME = "@mybricks/plugins/nocobase-connector";

interface NocobaseConfig {
  domain: string;
  apiKey: string;
  spaceName?: string;
}

type TestResult = {
  status: "success" | "error";
  title: string;
  detail: string;
  url?: string;
  httpStatus?: number;
};

function normalizeDomain(domain = "") {
  return domain.trim().replace(/\/+$/, "");
}

function normalizeSpaces(spaces: any[]): NocobaseSpaceOption[] {
  return spaces
    .map((space) => ({
      name: typeof space?.name === "string" ? space.name.trim() : "",
      title: typeof space?.title === "string" ? space.title : undefined,
    }))
    .filter((space) => space.name && space.name !== "_no-space")
    .sort((a, b) => (a.title || a.name).localeCompare(b.title || b.name));
}

function getSpaceLabel(space: NocobaseSpaceOption) {
  return space.title || space.name;
}

function getSelectedSpaceLabel(spaces: NocobaseSpaceOption[], spaceName: string) {
  if (spaceName === NOCOBASE_ALL_SPACE_VALUE) {
    return "全部业务空间";
  }

  const space = spaces.find((item) => item.name === spaceName);
  return space ? getSpaceLabel(space) : "全部业务空间";
}

function NocobaseConfigPanel({
  data,
}: {
  data: NocobaseConfig;
}) {
  const [domain, setDomain] = useState(data.domain || "");
  const [apiKey, setApiKey] = useState(data.apiKey || "");
  const [domainError, setDomainError] = useState("");
  const [apiKeyError, setApiKeyError] = useState("");
  const [testing, setTesting] = useState(false);
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [spaces, setSpaces] = useState<NocobaseSpaceOption[]>([]);
  const [spaceName, setSpaceName] = useState(data.spaceName || NOCOBASE_ALL_SPACE_VALUE);
  const apiKeyUrl = /^https?:\/\/.+/i.test(normalizeDomain(domain))
    ? `${normalizeDomain(domain)}/admin/settings/api-keys`
    : "";

  useEffect(() => {
    setDomain(data.domain || "");
    setApiKey(data.apiKey || "");
    setSpaceName(data.spaceName || NOCOBASE_ALL_SPACE_VALUE);
  }, [data]);

  const updateSpaces = (nextSpaces: NocobaseSpaceOption[]) => {
    const nextSpaceName = nextSpaces.some((space) => space.name === data.spaceName)
      ? data.spaceName || NOCOBASE_ALL_SPACE_VALUE
      : NOCOBASE_ALL_SPACE_VALUE;

    data.spaceName = nextSpaceName;
    setCurrentNocobaseSpaces(nextSpaces);
    setSpaces(nextSpaces);
    setSpaceName(nextSpaceName);
  };

  const clearSpaces = () => {
    data.spaceName = NOCOBASE_ALL_SPACE_VALUE;
    clearCurrentNocobaseSpaces();
    setSpaces([]);
    setSpaceName(NOCOBASE_ALL_SPACE_VALUE);
  };

  const readSpaces = async (config: { domain: string; apiKey: string }) => {
    const spacesUrl = `${config.domain}/api/spaces:list`;
    const spacesRequest = createNocobaseFetchRequest(spacesUrl, config.apiKey);
    const spacesResponse = await fetch(spacesRequest.url, spacesRequest.init);

    if (!spacesResponse.ok) {
      return [];
    }

    const spacesBody = await spacesResponse.json();
    return Array.isArray(spacesBody?.data) ? normalizeSpaces(spacesBody.data) : [];
  };

  useEffect(() => {
    const currentDomain = normalizeDomain(data.domain);
    const currentApiKey = data.apiKey?.trim?.() || "";

    if (!/^https?:\/\/.+/i.test(currentDomain) || !currentApiKey) {
      clearSpaces();
      return;
    }

    let canceled = false;
    setLoadingSpaces(true);

    readSpaces({ domain: currentDomain, apiKey: currentApiKey })
      .then((nextSpaces) => {
        if (!canceled) {
          updateSpaces(nextSpaces);
        }
      })
      .catch(() => {
        if (!canceled) {
          updateSpaces([]);
        }
      })
      .finally(() => {
        if (!canceled) {
          setLoadingSpaces(false);
        }
      });

    return () => {
      canceled = true;
    };
  }, [data]);

  const validateConfig = () => {
    const currentDomain = normalizeDomain(data.domain);
    const currentApiKey = data.apiKey?.trim?.() || "";
    let hasError = false;

    setDomainError("");
    setApiKeyError("");
    setTestResult(null);

    if (!currentDomain) {
      setDomainError("请输入 NocoBase 域名");
      hasError = true;
    } else if (!/^https?:\/\/.+/i.test(currentDomain)) {
      setDomainError("域名需以 http:// 或 https:// 开头");
      hasError = true;
    }

    if (!currentApiKey) {
      setApiKeyError("请输入 API Key");
      hasError = true;
    }

    return hasError ? null : {
      domain: currentDomain,
      apiKey: currentApiKey,
    };
  };

  const testConnection = async () => {
    const config = validateConfig();

    if (!config) {
      return;
    }

    setTesting(true);
    setTestResult(null);

    const url = `${config.domain}/api/collections:listMeta`;
    const request = createNocobaseFetchRequest(url, config.apiKey, getNocobaseSpacesViewHeader(data));

    try {
      const response = await fetch(request.url, request.init);

      if (!response.ok) {
        let detail = "";

        try {
          detail = await response.text();
        } catch {
          detail = "";
        }

        setTestResult({
          status: "error",
          title: "连接失败",
          detail: `HTTP ${response.status} ${response.statusText}${detail ? `：${detail.slice(0, 120)}` : ""}`,
          url,
          httpStatus: response.status,
        });
        return;
      }

      const body = await response.json();
      const collectionCount = Array.isArray(body?.data) ? body.data.length : 0;
      let nextSpaces: NocobaseSpaceOption[] = [];

      try {
        nextSpaces = await readSpaces(config);
        updateSpaces(nextSpaces);
      } catch {
        updateSpaces([]);
        nextSpaces = [];
      }

      setTestResult({
        status: "success",
        title: "连接正常",
        detail: nextSpaces.length > 0
          ? `已读取到 ${collectionCount} 个 collection，并检测到 ${nextSpaces.length} 个业务空间。`
          : `已读取到 ${collectionCount} 个 collection，未检测到业务空间。`,
        url,
        httpStatus: response.status,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "请检查域名和 API Key";
      setTestResult({
        status: "error",
        title: "连接失败",
        detail: errorMessage,
        url,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.title}>连接nocobase</div>
      <div className={styles.content}>
        <div className={styles.sectionTitle}>基础配置</div>
        <div className={styles.description}>
          连接后，AI 可以自主发现 NocoBase 的业务接口，并按需读取接口结构。
        </div>

        <div className={styles.field}>
          <label className={styles.label}>域名</label>
          <div className={`${styles.inputWrap} ${domainError ? styles.error : ""}`}>
            <span className={styles.prefixIcon}>
              <LinkOutlined />
            </span>
            <input
              className={styles.input}
              value={domain}
              placeholder="https://nocobase.example.com"
              onChange={(event) => {
                const value = event.target.value;
                data.domain = value;
                setDomain(value);
                clearSpaces();
              }}
              onBlur={() => {
                const value = normalizeDomain(domain);
                data.domain = value;
                setDomain(value);
              }}
            />
          </div>
          {domainError ? <div className={styles.errorText}>{domainError}</div> : null}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>API Key</label>
          <div className={`${styles.inputWrap} ${apiKeyError ? styles.error : ""}`}>
            <span className={styles.prefixIcon}>
              <KeyOutlined />
            </span>
            <input
              className={styles.input}
              value={apiKey}
              type="password"
              placeholder="请输入 NocoBase API Key"
              autoComplete="off"
              onChange={(event) => {
                const value = event.target.value;
                data.apiKey = value;
                setApiKey(value);
                clearSpaces();
              }}
            />
          </div>
          {apiKeyError ? <div className={styles.errorText}>{apiKeyError}</div> : null}
          <div className={styles.fieldTip}>
            在 NocoBase 管理端「设置 / API Keys」侧边栏添加一个用于测试的 API Key。
            {apiKeyUrl ? (
              <a className={styles.link} href={apiKeyUrl} target="_blank" rel="noreferrer">
                点我获取 API Key
              </a>
            ) : null}
          </div>
        </div>

        {spaces.length > 0 ? (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>业务空间</div>
            <div className={styles.description}>
              当前项目存在业务空间，接口将会以选择的业务空间来请求。
            </div>
            <div className={styles.field}>
              <label className={styles.label}>选择空间</label>
              <div className={styles.selectWrap}>
                <select
                  className={styles.select}
                  value={spaceName}
                  onChange={(event) => {
                    const value = event.target.value;
                    data.spaceName = value;
                    setSpaceName(value);
                  }}
                >
                  <option value={NOCOBASE_ALL_SPACE_VALUE}>全部业务空间</option>
                  {spaces.map((space) => (
                    <option key={space.name} value={space.name}>
                      {getSpaceLabel(space)}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.fieldTip}>
                当前选择：{getSelectedSpaceLabel(spaces, spaceName)}
              </div>
            </div>
          </div>
        ) : null}
        {loadingSpaces ? <div className={styles.fieldTip}>正在读取业务空间...</div> : null}

        <button className={styles.button} type="button" disabled={testing} onClick={testConnection}>
          {testing ? "测试中..." : "测试连接"}
        </button>

        {testResult ? (
          <div
            className={`${styles.testResult} ${
              testResult.status === "success" ? styles.resultSuccess : styles.resultError
            }`}
          >
            <div className={styles.testTitle}>{testResult.title}</div>
            <div className={styles.testDetail}>{testResult.detail}</div>
            {testResult.httpStatus ? (
              <div className={styles.testMeta}>HTTP Status：{testResult.httpStatus}</div>
            ) : null}
            {testResult.url ? <div className={styles.testMeta}>请求地址：{testResult.url}</div> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function nocobaseConfigPlugin() {
  const data: NocobaseConfig = {
    domain: "",
    apiKey: "",
  };
  let currentData = data;
  const getConfig = () => currentData;
  setupNocobaseAxiosInterceptor(getConfig);
  const tools = createNocobaseTools(getConfig);

  return {
    name: PLUGIN_NAME,
    namespace: PLUGIN_NAME,
    title: "连接nocobase",
    description: "让 AI 可以自主发现 NocoBase 的业务接口",
    data,
    onLoad({ data }) {
      currentData = data;
    },
    contributes: {
      sliderView: {
        tab: {
          title: "连接nocobase",
          icon: <LinkOutlined />,
          apiSet: [],
          render(params: any) {
            currentData = params?.data || data;
            return <NocobaseConfigPanel data={currentData} />;
          },
        },
      },
    },
    ai: {
      name: 'nocobase-connector',
      tools,
    }
  };
}
