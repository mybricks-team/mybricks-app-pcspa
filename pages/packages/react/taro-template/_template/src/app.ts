import { PropsWithChildren } from 'react'
import { configure } from '@nutui/icons-react-taro'
import '@nutui/icons-react-taro/dist/style_iconfont.css'

if (process.env.TARO_ENV === 'weapp') {
  configure({
    useSvg: false,
    tag: 'text'
  })
}


function App({ children }: PropsWithChildren<any>) {
  return children
}

export default App
