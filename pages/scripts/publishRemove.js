const fs = require('fs')  
const path = require('path')

const BASE_PATH_URL = path.resolve(__dirname, '../../')

const sourceFilePath = BASE_PATH_URL + '/assets'
const targetFilePath = BASE_PATH_URL + '/nodejs/module/template'
const targetPublicFilePath = BASE_PATH_URL + '/nodejs/module/public'

function init(filePath) {
  if(fs.existsSync(filePath)) { // 删除 template 目录
    files = fs.readdirSync(filePath)
  
    files.forEach(file => {
      fs.rmSync(filePath + '/' + file)
    })
  
    fs.rmdirSync(filePath)
  }
  
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(filePath)
  }
}

init(targetFilePath);
init(targetPublicFilePath);

fs.rename(sourceFilePath + '/publish.html', targetFilePath + '/publish.html', (err) => {
  if (err) throw err;
  console.log('publish.html Rename complete!');
});

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

