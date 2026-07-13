import JSZip from 'jszip';

/**
 * 代码结构生成器
 * 负责将组件数据按照代码结构生成并组织文件
 */
export interface FileItem {
  /** 文件名（包含相对路径，如 runtime.jsx） */
  fileName: string;
  /** 文件内容 */
  content: string | Blob;
}

export interface ExportProgress {
  /** 当前进度（0-100） */
  progress: number;
  /** 当前处理的文件 */
  currentFile?: string;
  /** 总文件数 */
  totalFiles: number;
  /** 已完成文件数 */
  completedFiles: number;
}

export interface ExportOptions {
  /** 文件夹名称 */
  folderName?: string;
  /** 进度回调 */
  onProgress?: (progress: ExportProgress) => void;
}

type FileSystemExportOptions = ExportOptions & {
  /** 是否创建导出目录 */
  isCreateFolder?: boolean;
}

export interface ExportMdOptions {
  fileName: string;
  mimeType: string;
  folderName?: string;
}

export type ExportMode = 'fileSystem' | 'download';

/**
 * 按当前环境导出代码文件。
 */
export async function exportCode(
  files: FileItem[],
  options: ExportOptions = {}
) {
  const mode = getExportMode();

  if (mode === 'fileSystem') {
    return exportToFileSystem(files, options);
  }

  return exportToDownload(files, options);
}

/**
 * 按当前环境导出 Markdown 文件。
 */
export async function exportMd(content: string, options: ExportMdOptions) {
  const mode = getExportMode();

  if (mode === 'fileSystem') {
    const { fileName, folderName } = options;
    return exportToFileSystem([
      {
        fileName,
        content,
      },
    ], {
      folderName,
      isCreateFolder: false,
    });
  }

  const { fileName, mimeType } = options
  triggerDownload(new Blob([content], { type: mimeType }), fileName)
}

/**
 * 将文件列表打包为 zip 并返回 Blob 对象。
 */
export async function exportToZip(
  files: FileItem[],
  options: ExportOptions = {}
) {
  const { folderName = 'app', onProgress } = options;
  const zip = new JSZip();
  const totalFiles = files.length;
  let completedFiles = 0;

  for (const file of files) {
    zip.file(`${folderName}/${file.fileName}`, file.content);
    completedFiles++;

    onProgress?.({
      progress: Math.round((completedFiles / totalFiles) * 100),
      currentFile: file.fileName,
      totalFiles,
      completedFiles,
    });
  }

  const blob = await zip.generateAsync({ type: 'blob' });

  return blob
}

/**
 * 触发浏览器下载。
 */
function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.click()
  } catch (error) {
    throw new Error(`文件下载失败: ${fileName}`)
  } finally {
    URL.revokeObjectURL(url)
  }
}


/**
 * 使用浏览器文件系统 API 导出文件。
 */
async function exportToFileSystem(
  files: FileItem[],
  options: FileSystemExportOptions = {}
) {
  const {
    folderName = 'app',
    onProgress,
    isCreateFolder = true,
  } = options;

  // 使用浏览器文件系统 API 导出
  console.log('[代码导出] 使用浏览器文件系统 API');

  try {
    // 1. 请求用户选择目录
    const directoryHandle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'downloads',
    });

    const targetDirHandle = isCreateFolder
      ? await directoryHandle.getDirectoryHandle(folderName, {
        create: true,
      })
      : directoryHandle

    // 3. 写入文件
    const totalFiles = files.length;
    let completedFiles = 0;

    for (const file of files) {
      await writeFile(targetDirHandle, file);
      completedFiles++;

      onProgress?.({
        progress: Math.round((completedFiles / totalFiles) * 100),
        currentFile: file.fileName,
        totalFiles,
        completedFiles,
      });
    }

    console.log(
      isCreateFolder
        ? `[浏览器导出] 成功导出 ${totalFiles} 个文件到: ${folderName}`
        : `[浏览器导出] 成功导出 ${totalFiles} 个文件到所选目录`,
    );
  } catch (error) {
    if ((error as any).name === 'AbortError') {
      console.log('[浏览器导出] 用户取消导出');
      throw new Error('用户取消导出');
    }
    throw error;
  }
}

/**
 * 将文件列表打包为 zip 并下载。
 */
async function exportToDownload(
  files: FileItem[],
  options: ExportOptions = {}
) {
  const { folderName = 'app' } = options;
  const blob = await exportToZip(files, options);
  triggerDownload(blob, `${folderName}.zip`)
  console.log(`[浏览器导出] 已下载 zip 包: ${folderName}.zip`);
}

/**
 * 写入单个文件（支持嵌套目录）
 */
async function writeFile(
  rootDirHandle: FileSystemDirectoryHandle,
  file: FileItem
): Promise<void> {
  const pathParts = file.fileName.split('/').filter(Boolean);
  const fileName = pathParts.pop();

  if (!fileName) {
    throw new Error(`无效的文件路径: ${file.fileName}`);
  }

  // 创建嵌套目录
  let currentDirHandle = rootDirHandle;
  for (const dirName of pathParts) {
    currentDirHandle = await currentDirHandle.getDirectoryHandle(dirName, {
      create: true,
    });
  }

  // 创建文件
  const fileHandle = await currentDirHandle.getFileHandle(fileName, {
    create: true,
  });

  // 写入内容
  const writable = await fileHandle.createWritable();
  await writable.write(file.content);
  await writable.close();
}

/**
 * 判断当前导出通道。
 */
function getExportMode(): ExportMode {
  if (window.isSecureContext && typeof window.showDirectoryPicker === 'function') {
    return 'fileSystem';
  }

  return 'download';
}
