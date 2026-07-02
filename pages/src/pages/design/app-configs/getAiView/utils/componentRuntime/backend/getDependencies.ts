// const honoModule = require('hono')
import { Hono } from 'hono'

import { honoApp } from './requestProxy'

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
      dynamic: true,
      module: (params: any) => {
        const { id, logger } = params
        if (!honoApp.app || !id.endsWith('/server/index.ts')) {
          return { Hono }
        }

        const HandledHono = new Proxy(Hono, {
          construct(Target: any, args: any[]) {
            const instance = new Target(...args)
            const prefix = `api/${id.replace('/server/index.ts', '').replace(/^\//, '')}`
            honoApp.honos.set(prefix, instance)
            honoApp.ready = false
            honoApp.logger = logger
            return instance
          },
        })
        return {
          Hono: HandledHono,
        }
      },
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
