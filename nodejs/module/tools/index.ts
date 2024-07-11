import * as fs from 'fs';
import * as path from 'path';

export function rimrafSync(target: string): void {
  let stats: fs.Stats;
  try {
    stats = fs.statSync(target);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return; // 如果文件或目录不存在，直接返回
    }
    throw err;
  }

  if (stats.isDirectory()) {
    // 如果是目录，递归删除目录中的所有文件和子目录
    const files = fs.readdirSync(target);
    for (const file of files) {
      const filePath = path.join(target, file);
      rimrafSync(filePath);
    }
    // 删除空目录
    fs.rmdirSync(target);
  } else {
    // 如果是文件，直接删除
    fs.unlinkSync(target);
  }
}