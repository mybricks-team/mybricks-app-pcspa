import React, {
  forwardRef,
  useState,
  useImperativeHandle,
  useRef
} from 'react'
import {
  Divider,
  Badge,
  Button
} from 'antd'
import { Locker, GlobalContext } from '@mybricks/sdk-for-app/ui'
import SaveTimeDisplay from './SaveTimeDisplay'
import { code } from './icon'
import styles from './index.less'
import CodeExportButton from '../code-export'

interface ToolbarProps {
  appData: {
    fileContent: {
      _updateTime: number
      [key: string]: any
    }
    user: any
    fileId: number
  }
  downloadVibeUI: () => void
  onOperableChange: (operable: boolean) => void
  beforeToggleUnLock: () => Promise<boolean>
  onSave: () => Promise<void>
  getExportToJSON: () => any
}

export interface TitlebarRef {
  setSavedTime: (savedTime: number) => void
  setHasUnsaved: (hasUnsaved: boolean) => void
  setCanSave: (canSave: boolean) => void
  setIsSaving: (isSaving: boolean) => void
}
const ToolBar = forwardRef<TitlebarRef, ToolbarProps>((props, ref) =>{ 
  const {
    appData,
    onSave,
    downloadVibeUI,
    onOperableChange,
    beforeToggleUnLock,
    getExportToJSON
  } = props

  const [savedTime, setSavedTime] = useState(appData.fileContent._updateTime)
  const [hasUnsaved, setHasUnsaved] = useState(false)
  const [canSave, setCanSave] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const appDataRef = useRef({
    fileContent: appData.fileContent,
    user: appData.user,
    fileId: appData.fileId
  })

  useImperativeHandle(ref, () => {
    return {
      setSavedTime,
      setHasUnsaved,
      setCanSave,
      setIsSaving,
    }
  })

  return (
    <div className={styles['toolbar']}>
      <div className={styles['toolbar-right']}>
        <div className={styles['toolbar-main']}>
          <GlobalContext.Provider value={{ fileContent: appDataRef.current.fileContent, user: appDataRef.current.user, fileId: appDataRef.current.fileId }}>
            <Locker
              statusChange={(props) => {
                if (typeof props === 'number') {
                  onOperableChange(props === 1)
                } else {
                  const { status } = props
                  onOperableChange(status === 1)
                }
              }}
              beforeToggleUnLock={beforeToggleUnLock}
              compareVersion={true}
              autoLock={true}
            />
          </GlobalContext.Provider>
          <div className={styles['save-actions']}>
            <Badge dot={hasUnsaved}>
              <Button
                type='primary'
                disabled={!canSave}
                loading={isSaving}
                onClick={() => {
                  appDataRef.current.fileContent.saveLoading = true
                  onSave()
                    .then((res: any) => {
                      if (res?.version) {
                        appDataRef.current.fileContent.version = res.version
                      }
                    })
                    .catch(() => {

                    })
                    .finally(() => {
                      setTimeout(() => {
                        appDataRef.current.fileContent.saveLoading = false
                      }, 1 * 10 * 1000)
                    })
                }}
              >
                保存
              </Button>
            </Badge>
            <CodeExportButton
              getExportToJSON={getExportToJSON}
            />
            <div
              data-mybricks-tip={`{content:'在 IDE 中打开',position:'bottom'}`}
              className={styles['code_btn']}
              onClick={() => downloadVibeUI()}
            >
              {code}
            </div>
          </div>
        </div>
        <SaveTimeDisplay savedTime={savedTime}/>
      </div>
      <Divider className={styles.toolbarDivider} />
    </div>
  )
})

export default ToolBar
