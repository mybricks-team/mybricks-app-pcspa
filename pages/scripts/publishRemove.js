const fs = require('fs')  
const path = require('path')

const BASE_PATH_URL = path.resolve(__dirname, '../../')

const sourceFilePath = BASE_PATH_URL + '/assets'
const targetFilePath = BASE_PATH_URL + '/nodejs/module/template'
const targetPublicFilePath = BASE_PATH_URL + '/nodejs/module/public'

function removeDir(dir) {
  let files = fs.readdirSync(dir)
  for(var i=0;i<files.length;i++){
    let newPath = path.join(dir,files[i]);
    let stat = fs.statSync(newPath)
    if(stat.isDirectory()){
      //如果是文件夹就递归下去
      removeDir(newPath);
    }else {
     //删除文件
      fs.unlinkSync(newPath);
    }
  }
  fs.rmdirSync(dir)//如果文件夹是空的，就将自己删除掉
}

if(fs.existsSync(targetFilePath)) { // 删除 template 目录
  removeDir(targetFilePath);
}
fs.mkdirSync(targetFilePath)

fs.rename(sourceFilePath + '/publish.html', targetFilePath + '/publish.html', (err) => {
  if (err) throw err;
  console.log('publish.html Rename complete!');
});


if(fs.existsSync(targetPublicFilePath)) { // 删除 template 目录
  removeDir(targetPublicFilePath);
}

// 复制目录
copyDirSync(sourceFilePath + '/public', targetPublicFilePath);


/**
 * 复制文件夹到目标文件夹
 * @param {string} src 源目录
 * @param {string} dest 目标目录
 * @param {function} callback 回调
 */
function copyDirSync (src, dest) {
  const copy = (copySrc, copyDest) => {
    const list = fs.readdirSync(copySrc);

    list.forEach((item) => {
      const ss = path.resolve(copySrc, item);
      const stat = fs.statSync(ss);

      const curSrc = path.resolve(copySrc, item);
      const curDest = path.resolve(copyDest, item);

      if (stat.isFile()) {
        // 文件，直接复制
        fs.createReadStream(curSrc).pipe(fs.createWriteStream(curDest));
      } else if (stat.isDirectory()) {
        // 目录，进行递归
        fs.mkdirSync(curDest, { recursive: true });
        copy(curSrc, curDest);
      }
    });
  };
 
  try { fs.accessSync(dest); } 
  catch(e) {
    // 若目标目录不存在，则创建
    fs.mkdirSync(dest, { recursive: true });
  }

  copy(src, dest);
};
