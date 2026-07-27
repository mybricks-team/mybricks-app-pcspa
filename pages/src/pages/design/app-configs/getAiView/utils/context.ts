export interface AppConfigViewport {
  /** 视口唯一标识，如 desktop、tablet、mobile */
  id: string
  /** 视口显示名称，如“PC端”、“移动端” */
  label: string
  /** 设计态画布宽度，仅用于画布预览和容器宽度切换 */
  width: number
}

export interface AppConfigBreakpointMedia {
  /** 视口宽度小于等于该值时媒体查询生效 */
  maxWidth: number
}

export interface AppConfigBreakpoint {
  /** 断点规则唯一标识，宽度适配场景建议与 viewports[].id 对齐 */
  id: string
  /** 媒体查询条件 */
  media: AppConfigBreakpointMedia
}

export interface AIAppConfig {
  /** 设计态可切换的画布视口配置；仅用于预览，不代表需要生成媒体查询 */
  viewports: AppConfigViewport[]
  /** 需要生成媒体查询的断点规则；为空数组时禁止生成 @media 代码 */
  breakpoints: AppConfigBreakpoint[]
}

class Context {
  public appConfig: AIAppConfig | null = null
}

export default new Context()
