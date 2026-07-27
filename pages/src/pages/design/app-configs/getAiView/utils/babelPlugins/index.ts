/**
 * 将 Babel 的 AST 节点对象转换为对应的原生 JavaScript 值（如对象、数组、字符串等）
 * @param node Babel AST 节点对象
 * @param scope 当前 Babel 作用域，用于解析静态常量引用
 * @returns 对应的原生 JavaScript 值
 */
export function astToValue(node, scope?) {
  if (!node) return undefined

  switch (node.type) {
    case 'ObjectExpression': {
      const obj = {}
      node.properties.forEach(prop => {
        if (prop.type === 'ObjectProperty') {
          const key = prop.key.name || prop.key.value
          obj[key] = astToValue(prop.value, scope)
        }
      })
      return obj
    }

    case 'ArrayExpression':
      return node.elements.map(el => astToValue(el, scope))

    case 'Identifier': {
      const binding = scope?.getBinding(node.name)
      const bindingNode = binding?.path?.node

      if (bindingNode?.type === 'VariableDeclarator') {
        return astToValue(bindingNode.init, binding.scope)
      }

      return undefined
    }

    case 'StringLiteral':
      return node.value

    case 'NumericLiteral':
      return node.value

    case 'BooleanLiteral':
      return node.value

    case 'NullLiteral':
      return null

    default:
      return undefined
  }
}

const babelPlugin = function (params, { context }) {
  return function (babel) {
    const { types: t } = babel
    const enterHandler = (programPath) => {
      const { scope, node } = programPath

      scope.traverse(node, {
        CallExpression (callPath) {
          const callee = callPath.node.callee
          switch (callee.name) {
            case 'defineAppConfig': {
              const appConfig = astToValue(
                callPath.node.arguments[0],
                callPath.scope,
              )
              context.appConfig = appConfig

              const hasDefineAppConfigImport = node.body.some(item => {
                if (
                  item.type !== 'ImportDeclaration' ||
                  item.source.value !== '_'
                ) {
                  return false
                }

                return item.specifiers.some(specifier => {
                  return (
                    specifier.type === 'ImportSpecifier' &&
                    specifier.imported.name === 'defineAppConfig'
                  )
                })
              })

              if (!hasDefineAppConfigImport) {
                programPath.unshiftContainer(
                  'body',
                  t.importDeclaration(
                    [
                      t.importSpecifier(
                        t.identifier('defineAppConfig'),
                        t.identifier('defineAppConfig'),
                      ),
                    ],
                    t.stringLiteral('_'),
                  ),
                )
              }

              return
            }
            default:
          }
        }
      })
    }
    
    return {
      visitor: {
        Program: { enter: enterHandler }
      }
    };
  }
}

export default ({ context }) => {
  return [(params) => babelPlugin(params, { context })]
}
