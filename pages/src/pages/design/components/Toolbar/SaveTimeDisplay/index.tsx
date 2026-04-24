import React from 'react'
import { unifiedTime } from './utils'
import styles from './index.less'

interface SaveTimeDisplayProps {
  savedTime: number | null
}

const SaveTimeDisplay: React.FC<SaveTimeDisplayProps> = ({ savedTime }) => {
  if (!savedTime) return null
  return (
    <div className={styles['save-time-row']}>
      <div className={styles['save-time']}>
        保存于 {unifiedTime(savedTime)}
      </div>
    </div>
  )
}

export default SaveTimeDisplay
