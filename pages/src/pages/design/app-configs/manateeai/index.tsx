import React, { useState, useRef, useCallback } from "react";
import { LinkOutlined } from "@ant-design/icons";
import {
  MANATEE_ALL_WORKSPACE_VALUE,
  ManateeConnector,
  ManateeWorkspaceOption,
} from "./datasource";
import { ConnectStep } from "./stepConnect";
import { WorkspaceStep } from "./stepWorkspace";
import styles from "./index.less";

// ==================== 共享类型 ====================

export interface ManateeConfigData {
  domain: string;
  apiKey: string;
  workspaceName: string;
  workspaceProjectId?: number;
  workspaceHost?: string;
  workspaceGroups?: string[]; // 扩展：保存选中的模块分组
}

// ==================== 工具函数 ====================

export function normalizeDomain(domain = ""): string {
  return domain.trim().replace(/\/+$/, "");
}

export function normalizeWorkspaces(spaces: any[]): ManateeWorkspaceOption[] {
  return spaces
    .map((space) => ({
      label: typeof space?.name === "string" ? space.name.trim() : "",
      key: typeof space?.id === "string" ? space.id : undefined,
    }))
    .filter((space) => space.label && space.label !== "_no-workspace")
    .sort((a, b) => (a.label || a.key).localeCompare(b.label || b.key));
}

export function getWorkspaceLabel(space: ManateeWorkspaceOption): string {
  return space.label;
}

export function getSelectedWorkspaceLabel(
  spaces: ManateeWorkspaceOption[],
  workspaceName: string,
): string {
  if(!workspaceName) return "请指定工作空间";
  const space = spaces.find((s) => s.label === workspaceName);
  return space ? getWorkspaceLabel(space) : "请指定工作空间";
}

// ==================== 步骤编排器 ====================

export function ManateeConfigPanel({ data }: { data: ManateeConfigData }) {
  const [workspaces, setWorkspaces] = useState<ManateeWorkspaceOption[]>([]);
  const [, forceUpdate] = useState(0);

  // 用 ref 保证 connector 的 getConfig 始终能读到最新 data
  const dataRef = useRef(data);
  dataRef.current = data;

  const [connector] = useState(() => new ManateeConnector(() => dataRef.current));

  /**
   * 统一更新 data 的方法
   * 保持 data 对象引用不变（兼容外部插件框架直接读取 data），仅触发渲染
   */
  const updateData = useCallback((updates: Partial<ManateeConfigData>) => {
    Object.assign(data, updates);
    forceUpdate((v) => v + 1);
  }, [data]);

  // 第一步测试成功，进入第二步
  const handleConnectSuccess = useCallback(
    (fetchedWorkspaces: ManateeWorkspaceOption[]) => {
      connector.setWorkspaces(fetchedWorkspaces);
      setWorkspaces(fetchedWorkspaces);
    },
    [connector]
  );

  // 第二步保存
  const handleSave = useCallback(
    (updates: Partial<ManateeConfigData>) => {
      updateData(updates);
      // 可扩展：在此处通知外部框架配置已变更
    },
    [updateData]
  );

  return (
    <div className={styles.container}>
      <div className={styles.title}>
        <span>
          <LinkOutlined style={{ marginRight: 6 }} />
          接口列表
        </span>
      </div>

      <div className={styles.content}>
          <ConnectStep
            data={data}
            connector={connector}
            onChange={updateData}
            onSuccess={handleConnectSuccess}
          />
          {workspaces.length != 0 && <WorkspaceStep
            data={data}
            connector={connector}
            workspaces={workspaces}
            onChange={updateData}
            onSave={handleSave}
          />}
      </div>
    </div>
  );
}

// ==================== 插件导出 ====================

const PLUGIN_NAME = "@mybricks/plugins/manatee-connector";

export default function manateeConfigPlugin() {
  const data: ManateeConfigData = {
    domain: "",
    apiKey: "",
    workspaceName: "",
  };

  // 插件级 connector（供 AI Tools 使用）
  const connector = new ManateeConnector(() => data);
  const tools = connector.createTools();

  return {
    name: PLUGIN_NAME,
    namespace: PLUGIN_NAME,
    title: "接口列表",
    description: "让 AI 可以自主发现业务接口",
    data,
    onLoad({ data: loadedData }: { data: ManateeConfigData }) {
      if (loadedData) {
        Object.assign(data, loadedData);
      }
    },
    contributes: {
      sliderView: {
        tab: {
          title: "接口列表",
          icon: <LinkOutlined />,
          apiSet: [],
          render(params: any) {
            return <ManateeConfigPanel data={data} />;
          },
        },
      },
    },
    ai: {
      name: "manatee-connector",
      tools,
    },
  };
}