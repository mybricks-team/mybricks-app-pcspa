export const MYBRICKS_LOGO = 'https://my.mybricks.world/image/icon.png'

// 暗黑模式圆形icon
export const MYBRICKS_LOGO_DARK = 'https://my.mybricks.world/image/icon.png'

export interface ThemeAssets {
  logo: string
  favicon?: string
  fontStyle?: React.CSSProperties
}

export interface ThemeConfig {
  light: ThemeAssets
  dark: ThemeAssets
}
export const themeConfig: ThemeConfig = {
  light: {
    logo: MYBRICKS_LOGO,
  },
  dark: {
    logo: MYBRICKS_LOGO_DARK,
  },
}
