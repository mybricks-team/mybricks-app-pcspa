import React, { useState } from 'react';
import { Button, Input, Typography, message } from 'antd';
import { TConfigProps } from '../useConfig';

const formatConfig = (data: any) => {
  try {
    if (!data) {
      return undefined;
    }
    return JSON.stringify(data);
  } catch (error) {
    return undefined;
  }
};

export default (props: TConfigProps) => {
  const { config, mergeUpdateConfig } = props;

  const [aiConfig, setAiConfig] = useState(formatConfig(config?.ai));

  React.useEffect(() => {
    setAiConfig(formatConfig(config?.ai));
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
    
    await mergeUpdateConfig({ ai: parsedConfig || {} });
    message.success('保存成功');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <Typography.Title level={5} style={{ marginBottom: 2 }}>AI配置</Typography.Title>
        <Button type="primary" onClick={saveAiConfig}>保存配置</Button>
      </div>
      <Input.TextArea
        rows={14}
        value={aiConfig}
        onChange={(e) => setAiConfig(e.target.value)}
        placeholder="请输入AI配置JSON..."
      />
    </div>
  );
};
