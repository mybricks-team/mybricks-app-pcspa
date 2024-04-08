export enum EnumPluginType {
  NORMAL = 'normal',
  CONNECTOR = 'connector'
}

export type PluginType = Partial<{
  name: string;
  title: string;
  url: string;
  type: EnumPluginType;
  disabled: boolean;
  runtimeUrl: string;
  description?: string;
  updateTime: string;
  user: Record<string, any>;
  isEdit?: boolean; // 是否正在编辑
  isAppend?: boolean; // 是否新增
}>;
