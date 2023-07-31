const path = require('path')

module.exports = {
  entry: {
    ['index']: path.resolve(__dirname, '../src/pages/home/index.tsx'),
    ['preview']: path.resolve(__dirname, '../src/pages/preview/index.tsx'),
    ['setting']: path.resolve(__dirname, '../src/pages/setting/index.tsx'),
    ['publish']: path.resolve(__dirname, '../src/pages/publish/index.tsx'),
  },
  output: {
    // 打包文件根目录
    filename: 'js/[name]-[contenthash].js',
    libraryTarget: 'umd',
    library: '[name]',
  },
  plugins: [],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    alias: {
      '@': path.resolve(__dirname, './../src'),
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
        test: /\.(xml|txt|html|cjs|theme)$/i,
        use: [{ loader: 'raw-loader' }],
      },
    ],
  },
}
