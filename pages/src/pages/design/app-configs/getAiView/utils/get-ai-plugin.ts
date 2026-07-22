import AIPlugin from '@mybricks/plugin-ai'

export default ({ user, key, plugins = [] }: any) => AIPlugin({
  user,
  key,
  plugins,
  componentRuntime: {
    workspace: {
      coder: {
        loaderConfig: {
          paths: {
            vs: './public/monaco-editor/0.45.0/min/vs'
          }
        },
        eslint: {
          src: './public/eslint/8.15.0/eslint.js',
          config: {
            env: {
              browser: true,
              es6: true,
            },
            parserOptions: {
              ecmaVersion: 2018,
              sourceType: "module",
            },
          },
        },
        jsxHighlight: {
          customTypescriptUrl: `${location.origin}/public/typescript/4.6.4/typescript.min.js`
        }
      }
    }
  }
})
