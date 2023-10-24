declare module '*.less' {
  const classes: { [key: string]: string };
  export default classes;
}

declare interface Window {
  _mybricks_render_web: RenderWeb;
  _mybricks_render_web_vue2: RenderWeb;
  _mybricks_render_web_vue3: RenderWeb;
  __POWERED_BY_QIANKUN__: boolean;
  React: React;
  Vue: Vue;
  ReactDOM: ReactDOM;
  antd: any;
  pluginConnectorDomain: Function
}

declare type RenderWeb = {
  render: (json: Record<string, any> | string, opts: Record<string, any>) => any
}