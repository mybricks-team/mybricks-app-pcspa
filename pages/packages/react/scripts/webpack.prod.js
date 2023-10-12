const { merge } = require('webpack-merge')
const path = require('path')
const common = require('./webpack.common')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const HtmlWebpackPlugin = require('html-webpack-plugin')
const WebpackBar = require('webpackbar')
const HtmlWebpackInlineSourcePlugin = require('@effortlessmotion/html-webpack-inline-source-plugin')

module.exports = merge(common, {
  mode: 'production',
  optimization: {
    minimize: true
  },
  output: {
    path: path.join(__dirname, '../../../../assets'),
  },
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: "static",
    }),
    new CleanWebpackPlugin({
      protectWebpackAssets: false,
      cleanAfterEveryBuildPatterns: ['**/*.LICENSE.txt', 'report.html'],
      cleanOnceBeforeBuildPatterns: ['**/*', '!favicon.ico*', '!css/**'],
    }),
    new WebpackBar(),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: path.resolve(__dirname, '../templates/index.html'),
      chunks: ['index'],
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
    }),
    new HtmlWebpackPlugin({
      filename: 'publish.html',
      template: path.resolve(__dirname, '../templates/publish.html'),
      inlineSource: '.(js)$',
      inject: 'body',
      removeComments: false,
      chunks: ['publish'],
    }),
    new HtmlWebpackInlineSourcePlugin()
  ]
})