const fs = require('fs')  
const path = require('path')

const BASE_PATH_URL = path.resolve(__dirname, '../../')

const sourceFilePath = BASE_PATH_URL + '/assets'
const targetFilePath = BASE_PATH_URL + '/nodejs/module/template'

if(fs.existsSync(targetFilePath)) { // 删除 template 目录
  files = fs.readdirSync(targetFilePath)

  files.forEach(file => {
    fs.rmSync(targetFilePath + '/' + file)
  })

  fs.rmdirSync(targetFilePath)
}

if (!fs.existsSync(targetFilePath)) {
  fs.mkdirSync(targetFilePath)
}

fs.rename(sourceFilePath + '/publish.html', targetFilePath + '/publish.html', (err) => {
  if (err) throw err;
  console.log('publish.html Rename complete!');
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

