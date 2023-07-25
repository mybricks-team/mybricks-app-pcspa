import React from 'react'
import {render} from 'react-dom'

import axios from 'axios'

import '@/reset.less'

axios.defaults.withCredentials = true

import App from './app'

console.log('version: 1.0.30-beta.3')

render(<App />, document.getElementById('root'))
