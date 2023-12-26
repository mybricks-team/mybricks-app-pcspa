import React, { FC, useRef, useMemo, useCallback, useState } from 'react';
import ReactDOM from 'react-dom';
import Editor from '@mybricks/code-editor';
import { AnyType } from '@/types';
import { CollaborationHttpContext } from './context';
import Button from './compoment/Button';
import Collapse from './compoment/Collapse';
import RadioButton from './compoment/RadioBtn';
import DebugForm from './compoment/debug';
import { getValidKeysBySchema, uuid, safeDecode } from '../utils';
import SQLPanel from '../sqlPanel';

import styles from './index.less';

interface CollaborationHttpProps {
  onClose?(): void;
  initService: AnyType;
  openFileSelector(): Promise<any>;
  originConnectors: any[];
  globalConfig: AnyType;
  connectorService: {
    add(item: AnyType): void;
    remove(item: AnyType): void;
    update(item: AnyType): void;
    test(item: AnyType, params: any): void;
  };
}

const fullScreen = (
  <svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
    <path d="M290 236.4l43.9-43.9c4.7-4.7 1.9-12.8-4.7-13.6L169 160c-5.1-0.6-9.5 3.7-8.9 8.9L179 329.1c0.8 6.6 8.9 9.4 13.6 4.7l43.7-43.7L370 423.7c3.1 3.1 8.2 3.1 11.3 0l42.4-42.3c3.1-3.1 3.1-8.2 0-11.3L290 236.4zM642.7 423.7c3.1 3.1 8.2 3.1 11.3 0l133.7-133.6 43.7 43.7c4.7 4.7 12.8 1.9 13.6-4.7L863.9 169c0.6-5.1-3.7-9.5-8.9-8.9L694.8 179c-6.6 0.8-9.4 8.9-4.7 13.6l43.9 43.9L600.3 370c-3.1 3.1-3.1 8.2 0 11.3l42.4 42.4zM845 694.9c-0.8-6.6-8.9-9.4-13.6-4.7l-43.7 43.7L654 600.3c-3.1-3.1-8.2-3.1-11.3 0l-42.4 42.3c-3.1 3.1-3.1 8.2 0 11.3L734 787.6l-43.9 43.9c-4.7 4.7-1.9 12.8 4.7 13.6L855 864c5.1 0.6 9.5-3.7 8.9-8.9L845 694.9zM381.3 600.3c-3.1-3.1-8.2-3.1-11.3 0L236.3 733.9l-43.7-43.7c-4.7-4.7-12.8-1.9-13.6 4.7L160.1 855c-0.6 5.1 3.7 9.5 8.9 8.9L329.2 845c6.6-0.8 9.4-8.9 4.7-13.6L290 787.6 423.7 654c3.1-3.1 3.1-8.2 0-11.3l-42.4-42.4z"></path>
  </svg>
);

const fullScreenExit = (
  <svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
    <path d="M391 240.9c-0.8-6.6-8.9-9.4-13.6-4.7l-43.7 43.7L200 146.3c-3.1-3.1-8.2-3.1-11.3 0l-42.4 42.3c-3.1 3.1-3.1 8.2 0 11.3L280 333.6l-43.9 43.9c-4.7 4.7-1.9 12.8 4.7 13.6L401 410c5.1 0.6 9.5-3.7 8.9-8.9L391 240.9zM401.1 614.1L240.8 633c-6.6 0.8-9.4 8.9-4.7 13.6l43.9 43.9L146.3 824c-3.1 3.1-3.1 8.2 0 11.3l42.4 42.3c3.1 3.1 8.2 3.1 11.3 0L333.7 744l43.7 43.7c4.7 4.7 12.8 1.9 13.6-4.7l18.9-160.1c0.6-5.1-3.7-9.4-8.8-8.8zM622.9 409.9L783.2 391c6.6-0.8 9.4-8.9 4.7-13.6L744 333.6 877.7 200c3.1-3.1 3.1-8.2 0-11.3l-42.4-42.3c-3.1-3.1-8.2-3.1-11.3 0L690.3 279.9l-43.7-43.7c-4.7-4.7-12.8-1.9-13.6 4.7L614.1 401c-0.6 5.2 3.7 9.5 8.8 8.9zM744 690.4l43.9-43.9c4.7-4.7 1.9-12.8-4.7-13.6L623 614c-5.1-0.6-9.5 3.7-8.9 8.9L633 783.1c0.8 6.6 8.9 9.4 13.6 4.7l43.7-43.7L824 877.7c3.1 3.1 8.2 3.1 11.3 0l42.4-42.3c3.1-3.1 3.1-8.2 0-11.3L744 690.4z"></path>
  </svg>
);
const MethodOpts = [
  { title: 'GET', value: 'GET' },
  { title: 'POST', value: 'POST' },
  { title: 'PUT', value: 'PUT' },
  { title: 'DELETE', value: 'DELETE' },
];
let container = document.querySelector('[data-id=http-plugin-panel-root]');
if (!container) {
  container = document.createElement('div');
  container.setAttribute('data-id', 'http-plugin-panel-root');
  document.body.appendChild(container);
}
const CollaborationHttp: FC<CollaborationHttpProps> = props => {
  const { onClose, connectorService, openFileSelector, initService, globalConfig } = props;
  const [service, setService] = useState<AnyType>(initService || {
    id: uuid(),
    type: 'http-sql',
    title: '',
    method: 'POST',
    input: '',
    output: '',
    path: ''
  });
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [fullScreenParamsEditor, setFullScreenParamsEditor] = useState(false);
  const [fullScreenResultEditor, setFullScreenResultEditor] = useState(false);
  const blurMapRef = useRef<any>({});
  const paramRef = useRef<HTMLDivElement>();
  const resultRef = useRef<HTMLDivElement>();
  const contextValue = useMemo(() => {
    return { addBlurAry: (key, blur) => (blurMapRef.current = { ...blurMapRef.current, [key]: blur }) };
  }, []);

  const onBlurAll = useCallback(() => {
    Object.values(blurMapRef.current).forEach((blur: any) => blur?.());
  }, []);
  const onSave = useCallback(() => {
    initService ? connectorService.update(service) : connectorService.add(service);
    onClose();
  }, [connectorService, service, initService, onClose]);

  const onParamsEditorFullscreen = () => {
    paramRef.current?.classList.add(styles.sidebarPanelCodeFull);
    setFullScreenParamsEditor(true);
  };
  const onParamsEditorFullscreenExit = () => {
    paramRef.current?.classList.remove(styles.sidebarPanelCodeFull);
    setFullScreenParamsEditor(false);
  };
  const onResultEditorFullscreen = () => {
    setFullScreenResultEditor(true);
    resultRef.current?.classList.add(styles.sidebarPanelCodeFull);
  };
  const onResultEditorFullscreenExit = () => {
    setFullScreenResultEditor(false);
    resultRef.current?.classList.remove(styles.sidebarPanelCodeFull);
  };

  const SQLPanelService = useMemo(() => {
    return {
      add: item => {
        const { id, type, ...other } = item;

        setService(service => {
          return {
            ...service,
            ...other,
            outputKeys: getValidKeysBySchema(service.outputKeys, other.resultSchema),
            excludeKeys: getValidKeysBySchema(service.excludeKeys, other.resultSchema),
            title: service.title || other.title,
          };
        });
      },
    };
  }, []);

  const onCloseFileSelector = useCallback(() => setShowFileSelector(false), []);

  return ReactDOM.createPortal(
    (
      <div className={styles.sidebarPanelEdit} data-id="plugin-panel" style={{ top: 40, left: 361 }} onClick={onBlurAll}>
        <CollaborationHttpContext.Provider value={contextValue}>
          <div className={styles.sidebarPanelTitle}>
            <div>领域接口</div>
            <div>
              <Button size="small" type="primary" onClick={onSave}>
                保 存
              </Button>
              <Button size="small" style={{ marginLeft: '12px' }} onClick={onClose}>
                关 闭
              </Button>
            </div>
          </div>
          <div className={styles.sidebarPanelContent}>
            <div className={styles.formItem}>
              <Collapse header='基本信息' defaultFold={false}>
                <div className={styles.item}>
                  <label>名称</label>
                  <div className={`${styles.editor} ${styles.textEdt}`}>
                    <input
                      type="text"
                      placeholder="服务接口的标题"
                      defaultValue={service.title}
                      onChange={(e) => setService(service => ({ ...service, title: e.target.value }))}
                    />
                  </div>
                </div>
                <div className={styles.item}>
                  <label>
                    地址
                  </label>
                  <div className={`${styles.editor} ${styles.textEdt}`}>
                    <Button size="small" type="default" className={styles.defaultButton} onClick={() => setShowFileSelector(true)}>
                      {service.domainServiceMap ? '更新' : '选择'}领域接口
                    </Button>
                    {service.domainServiceMap ? <div className={styles.serviceTitle}>已选择接口: {service.domainServiceMap.serviceTitle}（Path: /api/system/domain/run）</div> : null}
                  </div>
                </div>
                <div className={styles.item}>
                  <label>
                    <i>*</i>
                    请求方法
                  </label>
                  <div className={styles.editor}>
                    <RadioButton
                      value={service.method}
                      onChange={method => setService(service => ({ ...service, method }))}
                      options={MethodOpts}
                    />
                  </div>
                </div>
              </Collapse>
            </div>
            {service.domainServiceMap ? (
              <>
                <div className={styles.formItem}>
                  <Collapse header='当开始请求'>
                    {fullScreenParamsEditor ? (
                      <div onClick={onParamsEditorFullscreenExit} className={styles.sidebarPanelCodeIconFull}>
                        {fullScreenExit}
                      </div>
                    ) : (
                      <div onClick={onParamsEditorFullscreen} className={styles.sidebarPanelCodeIcon}>
                        {fullScreen}
                      </div>
                    )}
                    <Editor
                      onMounted={(editor, monaco, container: HTMLDivElement) => {
                        paramRef.current = container;
                        container.onclick = (e) => e.target === container && onParamsEditorFullscreenExit();
                      }}
                      env={{ isNode: false, isElectronRenderer: false }}
                      onChange={(code: string) => {
                        setService(service => ({ ...service, input: encodeURIComponent(code) }));
                      }}
                      value={safeDecode(service.input)}
                      width="100%"
                      height="100%"
                      minHeight={300}
                      language="javascript"
                      theme="light"
                      lineNumbers="off"
                      /** @ts-ignore */
                      scrollbar={{ horizontalScrollbarSize: 2, verticalScrollbarSize: 2 }}
                      minimap={{ enabled: false }}
                    />
                  </Collapse>
                </div>
                <div className={styles.formItem}>
                  <Collapse header='当返回响应'>
                    {fullScreenResultEditor ? (
                      <div onClick={onResultEditorFullscreenExit} className={styles.sidebarPanelCodeIconFull}>
                        {fullScreenExit}
                      </div>
                    ) : (
                      <div onClick={onResultEditorFullscreen} className={styles.sidebarPanelCodeIcon}>
                        {fullScreen}
                      </div>
                    )}
                    <Editor
                      onMounted={(editor, monaco, container: HTMLDivElement) => {
                        resultRef.current = container;
                        container.onclick = (e) => e.target === container && onResultEditorFullscreenExit();
                      }}
                      env={{ isNode: false, isElectronRenderer: false }}
                      onChange={(code: string) => {
                        setService(service => ({ ...service, output: encodeURIComponent(code) }));
                      }}
                      value={safeDecode(service.output)}
                      width="100%"
                      height="100%"
                      minHeight={300}
                      language="javascript"
                      theme="light"
                      lineNumbers="off"
                      /** @ts-ignore */
                      scrollbar={{ horizontalScrollbarSize: 2, verticalScrollbarSize: 2 }}
                      minimap={{ enabled: false }}
                    />
                  </Collapse>
                </div>
              </>
            ) : null}
            <div className={styles.formItem}>
              <Collapse header='接口调试' defaultFold={false}>
                <DebugForm
                  service={service}
                  connectorService={connectorService}
                  onChange={(value: Record<string, unknown>) => setService(service => ({ ...service, ...value }))}
                  globalConfig={globalConfig}
                />
              </Collapse>
            </div>
          </div>
        </CollaborationHttpContext.Provider>
        {showFileSelector ? (
          <SQLPanel
            single
            openFileSelector={openFileSelector}
            onClose={onCloseFileSelector}
            connectorService={SQLPanelService as AnyType}
          />
        ) : null}
      </div>
    ),
    container
  );
};

export default CollaborationHttp;