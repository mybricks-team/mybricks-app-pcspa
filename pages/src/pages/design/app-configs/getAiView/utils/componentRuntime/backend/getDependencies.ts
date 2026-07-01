// const honoModule = require('hono')
import { Hono } from 'hono'

import { setHonoApp } from './requestProxy'

// pg browser-compat shim (PGlite-backed) — maintained in the pg plugin.
import {
  Mysql2PromiseCompat,
  createMysql2PromiseCompat,
} from './mysql'
import dayjs from 'dayjs'
// import { PgCompat } from '../../../../plugins/pg/runtime'

// const OriginalHonoClass =
//   honoModule.Hono ??
//   honoModule.default?.Hono ??
//   honoModule.default ??
//   honoModule

/**
 * 包装 Hono class：
 * 用户执行 new Hono() 时，自动把该实例注册到 requestProxy 的 axios adapter 里。
 * 后续 componentAxios 的所有请求都会直接走到这个 Hono 实例处理，无需真实网络。
 */
const HandledHono = new Proxy(Hono, {
  construct(Target: any, args: any[]) {
    const instance = new Target(...args)
    setHonoApp(instance)
    return instance
  },
})

type RuntimeLogger = Pick<Console, 'log' | 'error'>

type GetDependenciesProps = {
  logger?: RuntimeLogger
}

const getDependencies = (props?: GetDependenciesProps) => {
  return {
    // pg: {
    //   version: '8.x (pglite-compat)',
    //   readme: '',
    //   module: PgCompat,
    // },
    hono: {
      version: '4.12.21',
      readme: '',
      module: { Hono: HandledHono },
    },
    ['mysql2/promise']: {
      version: '3.x (http-proxy-compat)',
      readme: '',
      module: props?.logger
        ? createMysql2PromiseCompat({ logger: props.logger })
        : Mysql2PromiseCompat,
    },
    dayjs: {
      version: '1.11.21',
      readme: '',
      module: dayjs,
    },
  }
}

export default getDependencies
