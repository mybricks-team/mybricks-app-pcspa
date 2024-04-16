const path = require('path')
const { merge } = require('webpack-merge')
const common = require('./webpack.common')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const WebpackBar = require('webpackbar')
const fs = require('fs')
const pkg = require(path.join(__dirname, '../../../../package.json'))

const appInfo = pkg.appConfig.react
module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  resolve: {
    alias: {},
  },
  devServer: {
    static: {
      directory: path.join(__dirname, '../templates'),
    },
    port: 9001,
    host: 'localhost',
    hot: true,
    client: {
      logging: 'info',
    },
    // open: `http://localhost:8001`,
    proxy: [
      {
        context: ['/api/pcpage/toCode', '/api/pcpage/publish', '/api/pcpage/upload', '/api/pcpage/rollback', '/api/pcpage/download-product', '/api/pcpage/searchUser'],
        target: 'https://test.mybricks.world/',
        // target: 'http://localhost:9002/mybricks-app-pcspa',
        headers: {
          cookie: 'Hm_lvt_d2ecca39b1c8b9e556bc0051744065bf=1707017080; Hm_lpvt_d2ecca39b1c8b9e556bc0051744065bf=1707124300; mybricks-login-user={"id":497330331922501,"email":"linzhujlu@foxmail.com","fingerprint":"d5ea529b605354f4401e9fd2e6cb9cd0"}'
        },
        secure: false,
        changeOrigin: true,
      },
      {
        context: ['/'],
        // target: 'https://test.mybricks.world/',
        // target: 'http://dev.manateeai.com/',
        headers: {
          cookie:'token=4799702de6cdf6f3bcfd399039a0e0ec; Hm_lvt_d2ecca39b1c8b9e556bc0051744065bf=1707017080; Hm_lpvt_d2ecca39b1c8b9e556bc0051744065bf=1707124300; mybricks-login-user={"id":433562046943301,"email":"linzhujlu@foxmail.com","fingerprint":"d5ea529b605354f4401e9fd2e6cb9cd0"}'
        },
        target: 'https://my.mybricks.world',
        // target: 'http://localhost:3100',
        secure: false,
        changeOrigin: true,
      },
    ]
  },
  plugins: [
    new WebpackBar(),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      chunks: ['index'],
      templateContent: ({ htmlWebpackPlugin }) => {
        let content = fs.readFileSync(path.resolve(__dirname, '../templates/index.html'), 'utf-8')
        content = content.replace('<!-- _APP_CONFIG_ -->', `<script>const _APP_CONFIG_ = {namespace: '${appInfo.name}'}</script>`)
        return content
      }
    }),
    new HtmlWebpackPlugin({
      filename: 'preview.html',
      template: path.resolve(__dirname, '../templates/preview.html'),
      chunks: ['preview'],
    }),
    new HtmlWebpackPlugin({
      filename: 'setting.html',
      template: path.resolve(__dirname, '../templates/setting.html'),
      chunks: ['setting'],
    }),
    new HtmlWebpackPlugin({
      filename: 'groupSetting.html',
      template: path.resolve(__dirname, '../templates/groupSetting.html'),
      chunks: ['groupSetting'],
    })
  ]
})