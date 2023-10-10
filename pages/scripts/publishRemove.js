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
fs.cp(sourceFilePath + '/public', targetPublicFilePath, { recursive: true }, (err) => {
  if (err) {
    console.error(err);
  }
});
// if(fs.existsSync(sourceFilePath + '/js')) {
//   files = fs.readdirSync(sourceFilePath + '/js')

//   files.forEach(file => {
//     if (file.includes('publish')) {
//       fs.rename(sourceFilePath + '/js/' + file, targetFilePath + '/' + file, (err) => {
//         if (err) throw err;
//         console.log('publish.js Rename complete!');
//       }); 
//     }
//   })
// }

