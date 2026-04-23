import { astToValue, codeToAst } from '../utils/ast'

export default function handleDefineAppConfig(callPath, programPath) {
  const appConfig = astToValue(callPath.node.arguments[0])
  const { pages } = appConfig

  let importCode = ''
  let routeCode = ''

  pages.forEach((page) => {
    const componentName = `Page_${page.replace(/[^a-zA-Z0-9]/g, '_')}`
    importCode += `import ${componentName} from './${page}'\n`
    routeCode += `<Route path={'${page}'} element={<${componentName} />}/>`
  })

  const newCode = `
  import { appRef, Routes, Route } from 'mybricks'
  ${importCode}

  import App from './app'

  export default function () {
    return (
      <App>
        <Routes>
          ${routeCode}
        </Routes>
      </App>
    )
  }
  `

  const result = codeToAst(newCode)
  programPath.node.body = result.ast.program.body
}