import * as fs from 'fs';
import * as path from 'path';

interface TemplateFile {
  fileName: string;
  content: string;
}


const TEMPLATE_PATH = path.join(__dirname, './_template');
const JSON_FILE_PATH = path.join(__dirname, '../../../src/pages/design/components/code-export/taro-template.json');

/**
 * 递归遍历目录并生成文件树结构
 * @param templateDir 模板目录路径，默认为当前文件所在目录下的 template 目录
 */
const generateTaroTemplateJson = (templateDir: string = TEMPLATE_PATH): TemplateFile[] => {
  const files: TemplateFile[] = [];

  // 需要忽略的目录和文件
  const ignoreList = [
    'node_modules',
    'dist',
    '.git',
    '.husky',
    '.swc',
    'yarn.lock',
    'package-lock.json',
  ];

  /**
   * 递归读取目录
   */
  const readDirectory = (dirPath: string, relativePath: string = ''): void => {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    // 按名称排序，目录在前
    entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
      // 跳过忽略列表中的项
      if (ignoreList.includes(entry.name)) {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);
      const itemRelativePath = relativePath
        ? `${relativePath}/${entry.name}`
        : entry.name;

      if (entry.isDirectory()) {
        readDirectory(fullPath, itemRelativePath);
      } else {
        try {
          files.push({
            fileName: itemRelativePath,
            content: fs.readFileSync(fullPath, 'utf-8'),
          });
        } catch {
          files.push({
            fileName: itemRelativePath,
            content: '',
          });
        }
      }
    }
  };

  readDirectory(templateDir);

  // 写入 JSON 文件，如果已存在则先删除
  if (fs.existsSync(JSON_FILE_PATH)) {
    fs.unlinkSync(JSON_FILE_PATH);
  }
  fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(files, null, 2));

  return files;
};

export default generateTaroTemplateJson;
