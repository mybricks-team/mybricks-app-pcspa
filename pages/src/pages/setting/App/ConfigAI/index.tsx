import React, { useState } from 'react';
import { Button, Input, Select, Typography, message } from 'antd';
import { TConfigProps } from '../useConfig';

const formatConfig = (data: any) => {
  try {
    if (!data) {
      return undefined;
    }
    const strData = typeof data === 'string' ? data : JSON.stringify(data);
    return decodeURIComponent(strData);
  } catch (error) {
    return undefined;
  }
};

// ==================== 项目配置（海牛） ====================

interface ProjectOption {
  label: string;
  value: number;
  datasource?: string;
}

const MANATEE_ERROR_MESSAGES: Record<number, { message: string; suggestion: string }> = {
  401: { message: '凭证无效或已过期', suggestion: '请重新登录后再试' },
  403: { message: '没有权限获取项目列表', suggestion: '请确认当前账号有访问该服务的权限' },
  404: { message: '项目列表接口不存在', suggestion: '请确认服务地址正确' },
  500: { message: '服务内部错误', suggestion: '请稍后重试' },
};

/** 与「接口列表」插件一致的请求头构建（Token / Session 从 localStorage 解码） */
function buildManateeHeaders(): Record<string, string> {
  const decode = (value: string | null) => {
    if (!value) return '';
    try {
      return atob(atob(value));
    } catch {
      return '';
    }
  };
  return {
    Accept: 'application/json',
    Token: decode(localStorage.getItem('token')),
    Session: decode(localStorage.getItem('session')),
    'Content-Type': 'application/json',
  };
}

function collectManateeProjects(nodes: any[]): ProjectOption[] {
  return nodes.map(node => ({
    label: node.name,
    value: node.id
  }))
}

/** 从海牛拉取项目（工作空间）列表，返回拍平后的选项 */
async function fetchManateeProjects(): Promise<ProjectOption[]> {
  const baseUrl = window.location?.origin;
  if (!baseUrl) throw new Error('无法获取当前服务地址');

  const targetUrl = `${baseUrl}/biz/customizeModule.do?lowcodeProjectId=0&lowcodeModule=queryProject`;

  const headers = new Headers(buildManateeHeaders());
  if (window.location?.hostname === 'my.mybricks.world') {
    headers.set('X-Target-Url', targetUrl);
  }

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const known = MANATEE_ERROR_MESSAGES[response.status];
    const suffix = known ? `。${known.suggestion}` : '。请稍后重试';
    throw new Error(`获取项目列表失败（HTTP ${response.status}）${suffix}`);
  }

  const body: any = await response.json().catch(() => null);
  const treeData = Array.isArray(body) ? body : body?.data?.outputData;
  if (!Array.isArray(treeData)) {
    throw new Error('项目列表返回格式异常，应为数组');
  }

  console.log('Manatee project tree data:', treeData, body);

  return collectManateeProjects(treeData);
}

const ProjectConfig: React.FC<{
  value?: number;
  onChange: (projectId: number | undefined) => void;
}> = ({ value, onChange }) => {
  const [options, setOptions] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const list = await fetchManateeProjects();
      setOptions(list);
      setLoaded(true);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Typography.Title level={5} style={{ marginBottom: 0 }}>项目配置</Typography.Title>
        <Button size="small" loading={loading} onClick={loadProjects} disabled={loading}>
          {loaded ? '刷新项目列表' : '加载项目列表'}
        </Button>
      </div>
      <Select
        style={{ width: '100%' }}
        placeholder="请选择项目"
        value={value}
        loading={loading}
        options={options}
        onChange={(next) => onChange(next as number)}
        allowClear
        showSearch
        optionFilterProp="label"
      />
      <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
        选择后 AI 助手将在这个项目下生成接口
      </div>
    </div>
  );
};

export default (props: TConfigProps) => {
  const { config, mergeUpdateConfig } = props;

  const [aiConfig, setAiConfig] = useState(formatConfig(config?.ai));
  const [projectId, setProjectId] = useState<number | undefined>(config?.aiProjectId);

  React.useEffect(() => {
    setAiConfig(formatConfig(config?.ai));
    setProjectId(config?.aiProjectId);
  }, [config]);

  const saveAiConfig = async () => {
    let parsedConfig;

    if (aiConfig) {
      try {
        parsedConfig = JSON.parse(aiConfig);
      } catch (error) {
        message.error('请输入正确的JSON格式');
        return;
      }
    }

    await mergeUpdateConfig({
      ai: parsedConfig ? encodeURIComponent(JSON.stringify(parsedConfig)) : undefined,
      aiProjectId: projectId,
    });
    message.success('保存成功');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 4 }}>
        <Button type="primary" onClick={saveAiConfig}>保存配置</Button>
      </div>
      <div style={{ marginBottom: 24, marginTop: 24 }}>
        <ProjectConfig value={projectId} onChange={setProjectId} />
      </div>
      <div>
        <Typography.Title level={5} style={{ marginBottom: 2 }}>AI配置</Typography.Title>
        <Input.TextArea
          rows={14}
          value={aiConfig}
          onChange={(e) => setAiConfig(e.target.value)}
          placeholder="请输入AI配置JSON..."
        />
      </div>
    </div>
  );
};
