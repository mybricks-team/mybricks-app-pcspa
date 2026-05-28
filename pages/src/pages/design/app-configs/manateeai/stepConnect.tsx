import React, { useState, useEffect, useCallback } from "react";
import {
  KeyOutlined,
  LinkOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from "@ant-design/icons";
import {
  ManateeConnector,
  ManateeWorkspaceOption,
} from "./datasource";
import styles from "./index.less";

// ---------- 本地类型（避免循环依赖） ----------
interface ConnectStepData {
  domain: string;
  apiKey: string;
  workspaceName: string;
  workspaceGroups?: string[];
}

interface TestResult {
  status: "success" | "error" | "warning";
  title: string;
  detail: string;
  suggestion?: string;
}

interface ConnectStepProps {
  data: ConnectStepData;
  connector: ManateeConnector;
  onChange: (updates: Partial<ConnectStepData>) => void;
  onSuccess: (workspaces: ManateeWorkspaceOption[]) => void;
}

// ---------- 本地工具函数 ----------
function normalizeDomain(domain = ""): string {
  return domain.trim().replace(/\/+$/, "");
}

function normalizeWorkspaces(spaces: any[]): ManateeWorkspaceOption[] {
  return spaces
    .map((space) => ({
      label: typeof space?.name === "string" ? space.name.trim() : "",
      key:   space?.id  ||  undefined,
      datasource: typeof space?.datasource === "string" ? space.datasource.trim() : undefined,
    }))
    .filter((space) => space.label && space.label !== "_no-workspace")
    .sort((a, b) => a.label.localeCompare(b.label));
}

export const ConnectStep: React.FC<ConnectStepProps> = ({
  data,
  connector,
  onChange,
  onSuccess,
}) => {
  // 本地表单状态（避免每输入一个字符就触发父组件重渲染）
  const [domain, setDomain] = useState(data.domain);
  const [apiKey, setApiKey] = useState(data.apiKey);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);

  // 校验与测试状态
  const [domainError, setDomainError] = useState("");
  const [apiKeyError, setApiKeyError] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // 同步外部 data 变化（应对父组件或插件框架直接修改 data 的场景）
  useEffect(() => {
    setDomain(data.domain);
    setApiKey(data.apiKey);
  }, [data.domain, data.apiKey]);

  // 表单校验
  const validateForm = useCallback((): { domain: string; apiKey: string } | null => {
    setDomainError("");
    setApiKeyError("");
    setTestResult(null);

    let hasError = false;
    const normalizedDomain = normalizeDomain(domain);

    if (!normalizedDomain) {
      setDomainError("请输入海牛域名");
      hasError = true;
    } else if (!/^https?:\/\/.+/i.test(normalizedDomain)) {
      setDomainError("域名需以 http:// 或 https:// 开头");
      hasError = true;
    }

    if (!apiKey.trim()) {
      setApiKeyError("请输入 API Key");
      hasError = true;
    }

    return hasError ? null : { domain: normalizedDomain, apiKey: apiKey.trim() };
  }, [domain, apiKey]);

  // 测试连接
  const testConnection = useCallback(async () => {
    const config = validateForm();
    if (!config) return;

    // 先把最新值同步给父组件，确保 connector 读取到最新配置
    onChange({ domain: config.domain, apiKey: config.apiKey });

    setTesting(true);
    setTestResult(null);

    try {
      // 1. 核心连通性测试,获取工作空间列表
      const entities = await connector.fetchSpaceTree();
      const count = entities.length;
      let nextWorkspaces: ManateeWorkspaceOption[] = [];
      nextWorkspaces = count ? normalizeWorkspaces(entities) : [];

      //  展示结果
      if (nextWorkspaces.length > 0) {
        setTestResult({
          status: "success",
          title: "连接正常",
          detail: `检测到 ${nextWorkspaces.length} 个工作空间。`,
        });
      } else {
        setTestResult({
          status: "warning",
          title: "连接正常（未检测到工作空间）",
          detail: `未检测到工作空间。`,
          suggestion: "如需使用工作空间隔离，请确认 API Key 有 workspaces:list 权限",
        });
      }

      // 4. 无论是否有工作空间，都推进到第二步让用户确认
      onSuccess(nextWorkspaces);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "请检查域名和 API Key";
      const isClassified = errMsg.includes("[");
      setTestResult({
        status: "error",
        title: "连接失败",
        detail: errMsg,
        suggestion: isClassified
          ? undefined
          : "请确认域名可访问，API Key 未过期，且服务正常运行",
      });
    } finally {
      setTesting(false);
    }
  }, [connector, onChange, onSuccess, validateForm]);

  const handleDomainBlur = () => {
    const normalized = normalizeDomain(domain);
    setDomain(normalized);
    onChange({ domain: normalized });
  };

  const handleApiKeyBlur = () => {
    const normalized = apiKey.trim();
    setApiKey(normalized);
    onChange({ apiKey: normalized });
  };

  const apiKeyUrl = /^https?:\/\/.+/i.test(normalizeDomain(domain))
    ? `${normalizeDomain(domain)}/admin/settings/api-keys`
    : "";

  return (
    <div>
      <div className={styles.sectionTitle}>基础配置</div>
      <div className={styles.description}>
        连接后，AI 可以自主发现海牛的业务接口，并按需读取接口结构。
      </div>

      {/* 域名 */}
      <div className={styles.field}>
        <label className={styles.label}>域名</label>
        <div className={`${styles.inputWrap} ${domainError ? styles.error : ""}`}>
          <span className={styles.prefixIcon}>
            <LinkOutlined />
          </span>
          <input
            className={styles.input}
            value={domain}
            placeholder="https://manatee.example.com"
            onChange={(e) => setDomain(e.target.value)}
            onBlur={handleDomainBlur}
          />
        </div>
        {domainError ? <div className={styles.errorText}>{domainError}</div> : null}
      </div>

      {/* API Key */}
      <div className={styles.field}>
        <label className={styles.label}>Token</label>
        <div className={`${styles.inputWrap} ${apiKeyError ? styles.error : ""}`}>
          <span className={styles.prefixIcon}>
            <KeyOutlined />
          </span>
          <input
            className={styles.input}
            value={apiKey}
            type={apiKeyVisible ? "text" : "password"}
            placeholder="请输入海牛 Token"
            autoComplete="off"
            onChange={(e) => setApiKey(e.target.value)}
            onBlur={handleApiKeyBlur}
          />
          <span
            className={styles.suffixIcon}
            onClick={() => setApiKeyVisible(!apiKeyVisible)}
            title={apiKeyVisible ? "隐藏" : "显示"}
          >
            {apiKeyVisible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
          </span>
        </div>
        {apiKeyError ? <div className={styles.errorText}>{apiKeyError}</div> : null}
        <div className={styles.fieldTip}>
          在海牛管理端「设置 / API Keys」添加一个用于测试的 API Key。
          {apiKeyUrl ? (
            <a className={styles.link} href={apiKeyUrl} target="_blank" rel="noreferrer">
              点我获取 API Key
            </a>
          ) : null}
        </div>
      </div>

      {/* 测试并继续 */}
      <button
        className={styles.button}
        type="button"
        disabled={testing}
        onClick={testConnection}
      >
        {testing ? "测试中..." : "测试连接并继续"}
      </button>

      {/* 测试结果 */}
      {testResult ? (
        <div
          className={`${styles.testResult} ${
            testResult.status === "success"
              ? styles.resultSuccess
              : testResult.status === "warning"
              ? styles.resultWarning
              : styles.resultError
          }`}
        >
          <div className={styles.testTitle}>{testResult.title}</div>
          <div className={styles.testDetail}>{testResult.detail}</div>
          {testResult.suggestion ? (
            <div className={styles.testMeta}>💡 {testResult.suggestion}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};