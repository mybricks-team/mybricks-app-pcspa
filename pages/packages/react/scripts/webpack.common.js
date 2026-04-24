const path = require('path')
const webpack = require('webpack')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const pkg = require(path.join(__dirname, '../../../../package.json'))

const appInfo = pkg.appConfig.react
module.exports = {
  entry: {
    ['index']: path.resolve(__dirname, '../../../src/pages/design/index.tsx'),
    ['preview']: path.resolve(__dirname, '../../../src/pages/preview/react-entry.ts'),
    ['setting']: path.resolve(__dirname, '../../../src/pages/setting/globalSettingIndex.tsx'),
    ['groupSetting']: path.resolve(__dirname, '../../../src/pages/setting/groupSettingIndex.tsx'),
    ['publish']: path.resolve(__dirname, '../../../src/pages/publish/react-entry.ts'),
  },
  output: {
    // 打包文件根目录
    filename: 'js/[name]-[contenthash].js',
    libraryTarget: 'umd',
    library: '[name]',
  },
  plugins: [
    new webpack.DefinePlugin({
      APP_NAME: JSON.stringify(appInfo.name),
      APP_TYPE: JSON.stringify('react'),
      APP_VERSION: JSON.stringify(appInfo.version),
      
      // ------ taro ------
      'ANTD_VERSION': JSON.stringify(5),
      'DEPRECATED_ADAPTER_COMPONENT': JSON.stringify(false),
      'process.env.TARO_VERSION': JSON.stringify('4.1.11'),
      'process.env.TARO_ENV': JSON.stringify('h5'),
      'process.env.FRAMEWORK': JSON.stringify('react'),
      'process.env.TARO_PLATFORM': JSON.stringify('web'),
      'process.env.SUPPORT_TARO_POLYFILL': JSON.stringify('disabled'),
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env.SUPPORT_DINGTALK_NAVIGATE': JSON.stringify('disabled'),
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: path.resolve(__dirname, '../templates/public'), to: "public" },
        { from: path.resolve(__dirname, '../templates/css'), to: "css" },
      ],
      options: {
        concurrency: 100,
      },
    }),
  ],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    alias: {
      '@': path.resolve(__dirname, '../../../src'),
      // "@mybricks/sdk-for-app": "/Users/lianglihao/Documents/GitHub/sdk-for-app/src",
      // ------ taro ------
      '@tarojs/taro$': '@tarojs/taro-h5',
      '@tarojs/runtime$': path.resolve(__dirname, '../../../src/pages/design/app-configs/getAiView/utils/componentRuntime/@tarojs/runtime/dist/index.js'),

      "@mybricks/rxai": 'E:/myBricks/rxai/src/index.ts',
      "@mybricks/plugin-ai": 'E:/myBricks/plugin-ai/index.tsx'
    },
  },
  externals: [
    {
      axios: 'axios',
      react: {
        commonjs: 'react',
        commonjs2: 'react',
        amd: 'react',
        root: 'React',
      },
      'react-dom': {
        commonjs: 'react-dom',
        commonjs2: 'react-dom',
        amd: 'react-dom',
        root: 'ReactDOM',
      },
      moment: 'moment',
      antd: 'antd',
      '@ant-design/icons': 'icons',
      '@mybricks/sdk-for-ai': 'mybricks_sdk_for_ai',
      '@mybricks/ai-utils': 'mybricks_ai_utils',
      // "@mybricks/plugin-ai": "MyBricksPluginAI",
    },
  ],
  module: {
    rules: [
      {
        test: /\.(tsx|ts)?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              silent: true,
              transpileOnly: true,
            },
          },
        ],
      },
      {
        test: /\.(jsx|js)?$/,
        use: [{
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-react'],
            plugins: [
              [
                '@babel/plugin-proposal-class-properties',
                {
                  loose: true,
                },
              ],
            ],
            cacheDirectory: true,
          },
        }],
        include: path.resolve(__dirname, '../src'),
      },
      {
        test: /\.less?$/,
        use: [
          {
            loader: 'style-loader',
            options: { injectType: 'singletonStyleTag' },
          },
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[local]_[hash:base64:5]',
              },
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  [
                    'postcss-preset-env',
                    {
                      // 其他选项
                    },
                  ],
                ],
              },
            },
          },
          {
            loader: 'less-loader',
            options: {
              lessOptions: {
                javascriptEnabled: true,
              },
            },
          },
        ],
      },
      {
        test: /\.css?$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(xml|txt|html|cjs|theme|md)$/i,
        use: [{ loader: 'raw-loader' }],
      },


      // ------ taro ------
      {
        test: /\.cjs$/,
        include: /node_modules/,
        type: 'javascript/auto',
      },
    ],
  },
}
