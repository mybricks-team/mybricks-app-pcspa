import type { VibePublishSourceItem } from './getPublishSource'

interface VibeAppCodeMapOptions {
  source: VibePublishSourceItem
  designerJSON?: any
}

const toIdentifier = (path: string) => path.replace(/[^a-zA-Z0-9]/g, '_')

const getGuiCard = (designerJSON?: any) => {
  const coms = designerJSON?.scenes?.[0]?.coms
  if (!coms) {
    return {}
  }

  const component = coms[Object.keys(coms)[0]]
  return component?.model?.data?.gui_card || {}
}

const buildVibeAppEntry = ({ source, designerJSON }: VibeAppCodeMapOptions) => {
  const { files } = source
  const emptyGuide = {
    title: '开始对话',
    subtitle: '你可以向我提问，或从下方场景快速开始',
    assistantTitle: '智能助手',
    ...getGuiCard(designerJSON),
  }
  const filesMap = files.reduce<
    Record<string, VibePublishSourceItem['files'][0]>
  >((acc, file) => {
    acc[file.path] = file
    return acc
  }, {})
  const toolsPath: string[] = []
  let skills: Array<{ md: string; configPathMap: Record<string, boolean> }> = []

  files.forEach(file => {
    const splitPath = file.path.split('/')

    if (file.path.endsWith('/SKILL.md')) {
      const match = file.content.match(/^---\s*\n([\s\S]*?)\n---/)
      if (!match) {
        return
      }

      const dir = file.path.split('/').slice(0, -1).join('/')
      const skill = {
        md: file.content,
        configPathMap: {},
      } as { md: string; configPathMap: Record<string, boolean> }

      files.forEach(item => {
        if (
          item.path.endsWith('index.config.ts') &&
          item.path.startsWith(dir) &&
          item.content.includes('defineConfig')
        ) {
          skill.configPathMap[item.path] = true
        }
      })

      if (Object.keys(skill.configPathMap).length) {
        skills.push(skill)
      }
      return
    }

    const isToolEntry = /^(skills\/[^/]+\/)?tools\/[^/]+\/index\.ts$/.test(
      file.path,
    )
    if (isToolEntry && file.content.includes('defineTool')) {
      toolsPath.push(file.path)
    }
  })

  const cardsPath: string[] = []

  skills.forEach(({ configPathMap }) => {
    Object.keys(configPathMap).forEach(configPath => {
      const splitConfigPath = configPath.split('/')
      const cardPath = splitConfigPath
        .slice(0, splitConfigPath.length - 1)
        .concat('index.tsx')
        .join('/')

      if (filesMap[cardPath]) {
        cardsPath.push(cardPath)
      } else {
        configPathMap[configPath] = false
      }
    })
  })

  skills = skills.filter(({ configPathMap }) =>
    Object.values(configPathMap).some(Boolean),
  )

  const importCards = cardsPath.reduce((code, cardPath) => {
    const cardName = toIdentifier(cardPath)
    const configPath = cardPath
      .split('/')
      .slice(0, -1)
      .concat('index.config.ts')
      .join('/')
    const configName = toIdentifier(configPath)

    return `${code}import ${cardName} from './${cardPath}'
import ${configName} from './${configPath}'
`
  }, '')

  const importTools = toolsPath.reduce((code, toolPath) => {
    const toolName = toIdentifier(toolPath)
    const toolDir = toolPath.split('/').slice(0, -1).join('/')

    return `${code}import ${toolName} from './${toolDir}'
`
  }, '')

  const cardsGroups = skills.length
    ? `[
${skills
  .map(({ md, configPathMap }) => {
    return `  {
    md: ${JSON.stringify(md)},
    cards: [
${Object.entries(configPathMap)
  .map(([configPath, enable]) => {
    if (!enable) {
      return ''
    }

    const configName = toIdentifier(configPath)
    const cardPath = configPath
      .split('/')
      .slice(0, -1)
      .concat('index.tsx')
      .join('/')
    const cardName = toIdentifier(cardPath)

    return `      {
        ...${configName},
        render: ${cardName}
      },`
  })
  .filter(Boolean)
  .join('\n')}
    ]
  }`
  })
  .join(',\n')}
]`
    : '[]'

  const customTools = `[
${toolsPath
  .map(toolPath => {
    const toolName = toIdentifier(toolPath)
    return `  (() => {
    try {
      return ${toolName}()
    } catch (error) {
      console.error('Failed to init tool ${toolName}:', error)
      return null
    }
  })(),`
  })
  .join('\n')}
].filter(Boolean)`

  return `import VibeAppContainer from 'mybricks/vibe-app-container'
import { CardContext } from '@mybricks/ai-render'
${importCards}${importTools}
const cardsGroups = ${cardsGroups}

const customTools = ${customTools}

const emptyGuideConfig = ${JSON.stringify(emptyGuide, null, 2)}

export default function App() {
  return (
    <VibeAppContainer
      cardsGroups={cardsGroups}
      customTools={customTools}
      emptyGuideConfig={emptyGuideConfig}
      CardContext={CardContext}
    />
  )
}
`
}

export const vibeAppCodeMap = (options: VibeAppCodeMapOptions) => {
  return {
    'index.tsx': buildVibeAppEntry(options),
  }
}
