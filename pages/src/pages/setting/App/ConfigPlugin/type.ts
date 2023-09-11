export type PluginType = {
    name: string;
    title: string;
    url: string;
    runtimeUrl: string;
    description?: string;
    updateTime: string;
    user: Record<string, any>;
};
