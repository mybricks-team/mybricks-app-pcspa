/** 单个主题 CSS 变量 */
export interface VibePublishThemeVar {
  propertyName: string
  value: string
  title?: string
  type?: string
}

/** 当前激活的主题信息 */
export interface VibePublishActiveTheme {
  id: string
  name?: string
  vars: VibePublishThemeVar[]
}

/** 单个可发布页面的信息 */
export interface VibePublishSourceItem {
  id: string
  name: string
  files: Array<{ path: string; content: string }>
  activeTheme?: VibePublishActiveTheme
  themes?: Array<VibePublishActiveTheme>
}

type RawFileItem = {
  path?: string
  fileName?: string
  content?: string
}

const normalizeFiles = (
  rawFiles: unknown,
): Array<{ path: string; content: string }> => {
  if (Array.isArray(rawFiles)) {
    return rawFiles
      .map(item => {
        const file = item as RawFileItem
        const filePath = file?.path || file?.fileName
        // @ts-ignore
        const content = file?.source || file?.content
        if (typeof filePath === 'string' && typeof content === 'string') {
          return {
            path: filePath,
            content: decodeURIComponent(content)
              .replaceAll(`@PopupVisible`, '')
              .replaceAll(
                /from\s+['"]mybricks['"]/g,
                `from '@mybricks/ai-render'`,
              ),
          }
        }
        return null
      })
      .filter(Boolean) as Array<{ path: string; content: string }>
  }

  if (rawFiles && typeof rawFiles === 'object') {
    return Object.entries(rawFiles).map(([path, value]) => {
      if (typeof value === 'string') {
        return { path, content: value }
      }
      if (
        value &&
        typeof value === 'object' &&
        typeof (value as RawFileItem).content === 'string'
      ) {
        return { path, content: (value as RawFileItem).content as string }
      }
      return { path, content: '' }
    })
  }

  return []
}

type RawThemeVar = {
  propertyName?: unknown
  value?: unknown
  title?: unknown
  type?: unknown
}

type RawTheme = {
  id?: unknown
  name?: unknown
  vars?: unknown
}

const normalizeThemeVars = (rawVars: unknown): VibePublishThemeVar[] => {
  if (!Array.isArray(rawVars)) {
    return []
  }
  return rawVars
    .map(item => {
      const v = item as RawThemeVar
      const propertyName =
        typeof v?.propertyName === 'string' ? v.propertyName.trim() : ''
      const value = typeof v?.value === 'string' ? v.value.trim() : ''
      if (!propertyName.startsWith('--') || !value) {
        return null
      }
      return {
        propertyName,
        value,
        title: typeof v?.title === 'string' ? v.title : undefined,
        type: typeof v?.type === 'string' ? v.type : undefined,
      }
    })
    .filter(Boolean) as VibePublishThemeVar[]
}

const normalizeActiveTheme = (
  rawData: unknown,
): VibePublishActiveTheme | undefined => {
  if (!rawData || typeof rawData !== 'object') {
    return undefined
  }

  const data = rawData as Record<string, any>

  // themes 直接是数组
  const themeList = data?.themes?.themes as RawTheme[]
  const activeThemeId: string = data?.themes?.activeThemeId || ''

  if (!themeList.length) {
    return undefined
  }

  const matchedTheme = activeThemeId
    ? themeList.find(t => t?.id === activeThemeId)
    : undefined

  const targetTheme =
    matchedTheme ||
    themeList.find(
      t => Array.isArray(t?.vars) && (t.vars as unknown[]).length > 0,
    )

  if (!targetTheme) {
    return undefined
  }

  const vars = normalizeThemeVars(targetTheme.vars)
  if (!vars.length) {
    return undefined
  }

  return {
    id:
      typeof targetTheme.id === 'string'
        ? targetTheme.id
        : String(targetTheme.id ?? ''),
    name: typeof targetTheme.name === 'string' ? targetTheme.name : undefined,
    vars,
  }
}

const normalizeItem = (raw: Record<string, any>): VibePublishSourceItem => {
  // const files = normalizeFiles(raw?.files ?? raw?.codeMap ?? raw?.code)
  const files = normalizeFiles(raw?.data?.files)
  if (!files.length) {
    throw new Error('publish source files is empty')
  }

  console.log(`normalize files: `, files)

  const id =
    (raw?.id as string) ||
    (raw?.componentName as string) ||
    String(Math.random())

  const name =
    (raw?.name as string) ||
    (raw?.title as string) ||
    (raw?.componentName as string) ||
    id

  const activeTheme = normalizeActiveTheme(raw?.data)

  const res = {
    id,
    name,
    files,
    activeTheme,
    themes: raw?.data?.themes?.themes || [],
  }
  return res
}

export const getVibePublishSourceList = async (): Promise<
  VibePublishSourceItem[]
> => {
  // @ts-expect-error window._forApp_ is injected by the host app
  if (!window?._forApp_?._getResourcesCode_) {
    throw new Error('window._forApp_._getResourcesCode_ is unavailable')
  }

  // @ts-expect-error window._forApp_ is injected by the host app
  const result = window._forApp_._getResourcesCode_('application')
  if (!result || typeof result !== 'object') {
    throw new Error('empty publish source result')
  }

  const rawList = Array.isArray(result) ? result : [result]
  return rawList.map((raw: unknown) => {
    if (!raw || typeof raw !== 'object') {
      throw new Error('invalid publish source item')
    }
    return normalizeItem(raw as Record<string, unknown>)
  })
}
