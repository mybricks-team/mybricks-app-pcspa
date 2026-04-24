import React, { forwardRef } from 'react'
import { themeConfig } from '../../common/const'
import { useTheme } from '../../hooks/useTheme'
import styles from './index.less'

interface ToolbarProps {
  vbDesignContext?: any
  disabled?: boolean
  title?: string
  isCurrentUser?: boolean
  role?: string
  onOK?: (values: { title?: string }) => Promise<void>
  save?: (value?: { silent?: boolean }) => Promise<boolean>
  canSave?: boolean
  onNavigateAway?: () => boolean
}

export interface TitlebarRef {
  setTitle: (nextTitle: string) => void
}

const Titlebar = forwardRef<TitlebarRef, ToolbarProps>(
  ({ title }) => {
    const { isDarkMode, currentAssets } = useTheme(themeConfig)

    const handleToHome = async () => {
      window.top.location.href = '/'
    }

    return (
      <div
        className={`${styles['toolbar-left']}`}
      >
        <div
          className={styles['brand']}
          onClick={handleToHome}
        >
          <div className={styles['brand-icon-wrap']}>
            <div className={styles['user-info']}>
              <img
                src={currentAssets.logo}
                alt=""
                style={{ width: 16, height: 16 }}
              />
            </div>
          </div>
        </div>
        <div className={styles['edit-title-wrap']}>
          <span
            style={{ cursor: 'default' }}
            className={`${styles['page-slogan-title']} ${isDarkMode ? styles['page-slogan-title-dark'] : ''}`}
          >
            {title}
          </span>
        </div>
      </div>
    )
  },
)

export default Titlebar
