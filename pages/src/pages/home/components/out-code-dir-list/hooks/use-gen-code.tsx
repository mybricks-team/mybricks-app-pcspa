import React, { useState } from 'react'
import { message } from 'antd'
import { fAxios as axios } from "@/services/http";
import { setLocalData, getLocalData } from '../../../utils/fileSystemHandle'
import { Modal } from 'antd';

interface Props {
  save: (...args: any) => Promise<any>
  contextInfo: {
    fileName: string
    componentName?: string
    fileId: any
    userId: any
  }
  getParam: (...args: any) => {
    [key: string]: any
    configuration: {
      comLibs: any[]
    }
  }
}

function stringToArrayBuffer(str: string) {
  // 使用TextEncoder将字符串转换为UTF-8编码的字节
  const encoder = new TextEncoder()
  const view = encoder.encode(str)
  return view.buffer
}

async function writeFile(dirHandle: FileSystemDirectoryHandle, fileName: string, content: any) {
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const writableStream = await fileHandle.createWritable()
  await writableStream.write(typeof content === 'string' ? stringToArrayBuffer(content) : content)
  await writableStream.close()
}

// 将 base64 数据转换为 ArrayBuffer
function base64ToArrayBuffer(base64Data: string) {
  const binaryString = window.atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; ++i) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

const useGenCode = ({
  save,
  contextInfo,
  getParam,
}: Props) => {
  const [localSaveLoading, setLocalSaveLoading] = useState(false)

  const genCode = async (options: {
    componentName: string,
    toLocalType: 'react' | 'vue',
    staticResourceToCDN: boolean,
    loadingMessage?: string,
  }) => {
    const { componentName, toLocalType, staticResourceToCDN, loadingMessage } = options

    const close = message.loading({
      key: 'toCode',
      content: loadingMessage || '出码中...',
      duration: 0,
    })

    let jsonParams

    try {
      jsonParams = getParam()
    } catch (e: any) {
      console.error('get param of genCom 报错: ', e)
      message.error(
        `出码失败: toJSON({ withDiagrams: true }) 报错 ${e.message}`
      )
      close()
    }

    if (jsonParams) {
      return await axios({
        method: 'post',
        timeout: 60 * 1000,
        url: '/api/pcpage/publishToCom',
        data: {
          toLocalType,
          userId: contextInfo.userId,
          fileId: contextInfo.fileId,
          componentName: componentName,
          envType: 'test',
          json: jsonParams,
          staticResourceToCDN,
        },
      }).then((res: any) => {
        const { code, data, message: msg } = res
        if (code !== 1) { throw new Error(msg); }
        return data
      }).finally(() => { close(); })
    }
  }

  const saveCodeToLocal = async (
    baseDirHandle: FileSystemDirectoryHandle,
    options: {
      componentName: string,
      toLocalType: 'react' | 'vue',
      staticResourceToCDN: boolean,
      loadingMessage?: string,
      fileId: number,
      id: string,
    }
  ) => {
    try {
      setLocalSaveLoading(true)
      await save()

      const dirName = options.componentName || contextInfo.fileName;

      const curOutCodePath = `${baseDirHandle.name}/${dirName}`;

      let samePathExist = false;
      // @ts-expect-error values() 已在 chrome86 版本支持
      for await (const childFileHandle of baseDirHandle.values()) {
        const curPath = `${baseDirHandle.name}/${childFileHandle.name}`;
        if (curPath === curOutCodePath) samePathExist = true;
      }

      const localData = await getLocalData();

      // 如果出码路径变化，且有同名文件，则提示用户 ”是否覆盖“
      if (samePathExist && await curOutCodePath !== localData.outCodePathMap?.[options.id]) {
        await new Promise((res, rej) => {
          Modal.confirm({
            title: '提示',
            content: <div><span style={{ fontWeight: 'bold' }}>{curOutCodePath}</span> 文件夹已存在，是否覆盖？</div>,
            onOk() { res(true); },
            onCancel() { rej({ type: 'info', message: '用户选择不覆盖' }); }
          })
        });
      }

      // 创建文件夹并获得权柄
      const targetDirHandle = await baseDirHandle.getDirectoryHandle(dirName, { create: true });

      // create a FileSystemWritableFileStream to write to
      const content = await genCode(options);

      if (!content) { message.error(`出码失败!`); return; };

      const indexName = options.toLocalType === 'vue' ? `index.vue` : `index.tsx`;

      await writeFile(targetDirHandle, indexName, content.index);
      await writeFile(targetDirHandle, 'config.ts', content.config);
      await writeFile(targetDirHandle, 'README.md', content.readme);
      if (!options.staticResourceToCDN && content.staticResources?.length) {
        const assetsDirHandle = await targetDirHandle.getDirectoryHandle('assets', { create: true });
        for (const staticResource of content.staticResources) {
          await writeFile(assetsDirHandle, staticResource.filename, base64ToArrayBuffer(staticResource.content));
        }
      }

      await setLocalData({ outCodePathMap: { ...localData.outCodePathMap, [options.id]: curOutCodePath } });
      message.success('发布到本地成功')
    } catch (err: any) {
      if (err.type === 'info') {
        console.log(err.message);
      } else {
        console.error(err.name, err.message)
        message.error(`发布到本地失败: ${err.message}`)
      }
    } finally { setLocalSaveLoading(false); }
  }

  return [saveCodeToLocal, localSaveLoading, setLocalSaveLoading] as const;
}

export default useGenCode
