const fs = require('fs');
const path = require('path');

module.exports = class BuildPlugin {
  constructor (props) {
    this._props = props;
  }

  apply (compiler) {
    compiler.hooks.done.tap('BuildPluginDone', () => {
      const { rootPath, outputPath } = this._props;
      const templateCssDirPath = path.resolve(rootPath, './templates/css');
      const assetsCssDirPath = path.resolve(outputPath, './css');

      if (!fs.existsSync(assetsCssDirPath)) {
        console.log('不存在css文件夹')
        fs.mkdirSync(assetsCssDirPath)
      }

      ['global.css', 'theme.css'].forEach((filename) => {
        fs.copyFileSync(path.resolve(templateCssDirPath, filename), path.resolve(assetsCssDirPath, filename))
      })
    });
  }
};
