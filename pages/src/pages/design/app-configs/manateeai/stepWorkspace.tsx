import React, { useState, useEffect, useCallback } from "react";
import { Select, Button, message } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import {
  ManateeConnector,
  ManateeWorkspaceOption,
} from "./datasource";
import styles from "./index.less";
import { type ManateeConfigData } from "./index";

interface WorkspaceStepProps {
  data: ManateeConfigData;
  connector: ManateeConnector;
  workspaces: ManateeWorkspaceOption[];
  onChange: (updates: Partial<ManateeConfigData>) => void;
  onBack: () => void;
  onSave: (updates: Partial<ManateeConfigData>) => void;
}

// ---------- 本地工具函数 ----------

function getSelectedWorkspaceLabel(
  spaces: ManateeWorkspaceOption[],
  workspaceName: string,
): string {
  const space = spaces.find((s) => s.label === workspaceName);
  return space ? space.label : "请指定工作空间";
}

function normalizeWorkspaceGroups(items: any[]): ManateeWorkspaceOption[] {
  const groups = new Map<string, ManateeWorkspaceOption>();

  const addGroup = (key: string | undefined, label: string | undefined) => {
    if (!key || key === "_no-workspace") return;
    const normalizedKey = String(key).trim();
    const normalizedLabel = label ? String(label).trim() : normalizedKey;
    if (!normalizedKey) return;
    if (!groups.has(normalizedKey)) {
      groups.set(normalizedKey, { key: normalizedKey, label: normalizedLabel });
    }
  };

  const walk = (item: any) => {
    if (!item || typeof item !== "object") return;

    const groupKey = item.key ?? item.id ?? item?.module?.id;
    const groupLabel = item.title ?? item.label ?? item?.module?.moduleName ?? item?.module?.moduleCode;
    addGroup(groupKey != null ? String(groupKey) : undefined, typeof groupLabel === "string" ? groupLabel : undefined);

    if (Array.isArray(item.children)) {
      item.children.forEach(walk);
    }
  };

  items.forEach(walk);
  return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
}

export const WorkspaceStep: React.FC<WorkspaceStepProps> = ({
  data,
  connector,
  workspaces,
  onChange,
  onBack,
  onSave,
}) => {
  const [workspaceName, setWorkspaceName] = useState(data.workspaceName);
  const [selectedGroups, setSelectedGroups] = useState<string[]>(data.workspaceGroups || []);
  const [workspaceGroups, setWorkspaceGroups] = useState<ManateeWorkspaceOption[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // 同步外部 data 变化
  useEffect(() => {
    setWorkspaceName(data.workspaceName);
    setSelectedGroups(data.workspaceGroups || []);
  }, [data.workspaceName, data.workspaceGroups]);

  // 加载模块分组（依赖当前选中的 workspaceName）
  useEffect(() => {
    const currentDomain = data.domain?.trim() || "";
    const currentApiKey = data.apiKey?.trim() || "";

    if (!/^https?:\/\/.+/i.test(currentDomain) || !currentApiKey || workspaces.length === 0) {
      setWorkspaceGroups([]);
      return;
    }

    let canceled = false;
    setLoadingGroups(true);

    const loadGroups = async () => {
      try {
        const payload = await connector.fetchModuleTree();
        let groups: ManateeWorkspaceOption[] = [];

        if (Array.isArray(payload)) {
          groups = normalizeWorkspaceGroups(payload);
        }

        if (!canceled) setWorkspaceGroups(groups);
      } catch (err) {
        console.warn(
          `[海牛] 工作空间分组读取异常: ${err instanceof Error ? err.message : String(err)}`
        );
        if (!canceled) setWorkspaceGroups([]);
      } finally {
        if (!canceled) setLoadingGroups(false);
      }
    };

    loadGroups();

    return () => {
      canceled = true;
    };
  }, [data.domain, data.apiKey, data.workspaceHost, data.workspaceProjectId, workspaces.length, connector]);

  const handleWorkspaceChange = (value: any, option: any) => {
    const selectedDatasource = typeof option?.datasource === "string" ? option.datasource : "";

    setWorkspaceName( option?.label,);
    onChange({
      workspaceName: option?.label,
      workspaceHost: selectedDatasource,
      workspaceProjectId: option?.key != null ? option.key : undefined,
    });
    setSelectedGroups([]);
  };

  const handleSave = useCallback(() => {
    // 清除元数据缓存，确保 AI 下次拿到最新接口结构
    connector.clearModuleTreeCache();
    onSave({
      workspaceName,
      workspaceGroups: selectedGroups,
    });
    message.success("工作空间配置已保存");
  }, [workspaceName, selectedGroups, connector, onSave]);

  const groupOptions = workspaceGroups.map((g) => ({
    label: g.label,
    value: g.key,
    key: g.key,
  }));

  return (
    <div>
      {/* 返回第一步 */}
      
      {/* <div className={styles.subTitle}>
         <span className={styles.sectionTitle}>工作空间</span>
         <Button className={styles.subTitleBtn} type="link" onClick={onBack} icon={<ArrowLeftOutlined />}>
          返回上一步
        </Button>
      </div> */}
      <div className={styles.sectionTitle} style={{ marginTop: 20 }}>工作空间</div>
      <div className={styles.description}>
        当前项目存在工作空间，接口将会以选择的工作空间来请求。
      </div>

      {/* 工作空间选择 */}
      <div className={styles.field}>
        <label className={styles.label}>选择空间</label>
        <div className={styles.selectWrap}>
          <Select
            className={styles.select}
            value={workspaceName}
            onChange={(value:any, option) => handleWorkspaceChange(value, option)}
            options={[
              ...workspaces.map((workspace) => ({
                label: workspace.label,
                value: workspace.key,
                key: workspace.key,
                datasource: workspace.datasource,
              })),
            ]}
          />
        </div>
        <div className={styles.fieldTip}>
          当前选择：{getSelectedWorkspaceLabel(workspaces, workspaceName)}
        </div>
      </div>

      {/* 模块分组（可选） */}
       {/*<div className={styles.section} style={{ marginTop: 14 }}>
        <div className={styles.sectionTitle}>选择页面所属模块（可选）</div>
        <div className={styles.description}>
          进一步限定业务范围，让 AI 聚焦在特定分组上
        </div>
        <div className={styles.field}>
          <Select
            className={styles.select}
            mode="multiple"
            style={{ width: "100%" }}
            value={selectedGroups}
            onChange={(value: string[]) => setSelectedGroups(value)}
            options={groupOptions}
            placeholder="请选择模块分组"
            loading={loadingGroups}
          />
        </div>
        {loadingGroups && (
          <div className={styles.fieldTip}>正在读取模块分组...</div>
        )}
      </div> */}

      {/* 保存 */}
      <div className={styles.section} style={{ marginTop: 20 }}>
        <button className={styles.button} type="button" onClick={handleSave}>
          保存并启用
        </button>
      </div>
    </div>
  );
};