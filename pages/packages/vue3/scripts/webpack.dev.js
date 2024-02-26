const path = require('path')
const { merge } = require('webpack-merge')
const common = require('./webpack.common')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const WebpackBar = require('webpackbar')
const fs = require('fs')
const pkg = require(path.join(__dirname, '../../../../package.json'))

const appInfo = pkg.appConfig.vue3;

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
    port: 9003,
    host: 'localhost',
    hot: true,
    client: {
      logging: 'info',
    },
    proxy: [
      {
        context: ['/api/pcpage/publish', '/api/pcpage/upload'],
        // target: 'https://my.mybricks.world',
        target: 'http://localhost:9002',
        secure: false,
        changeOrigin: true,
      },
      {
        context: ['/'],
        target: 'https://test.mybricks.world/',
        // target: 'https://my.mybricks.world',
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