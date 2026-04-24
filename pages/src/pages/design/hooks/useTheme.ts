import { useEffect, useState } from 'react'
import { ThemeAssets, ThemeConfig } from '../common'

export const useTheme = (config: ThemeConfig) => {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [currentAssets, setCurrentAssets] = useState<ThemeAssets>(config.light)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const updateTheme = () => {
      const darkMode = mediaQuery.matches
      setIsDarkMode(darkMode)
      setCurrentAssets(darkMode ? config.dark : config.light)
    }

    // 初始化
    updateTheme()

    // 监听主题变化
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateTheme)
    } else {
      // 兼容旧版浏览器
      mediaQuery.addListener(updateTheme)
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', updateTheme)
      } else {
        mediaQuery.removeListener(updateTheme)
      }
    }
  }, [config])

  return {
    isDarkMode,
    currentAssets,
  }
}
