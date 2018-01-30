import path from 'path'
import dotenv from 'dotenv'

// load config env
let root = path.normalize(__dirname + '/../..')
const configFile = `${root}/config.env`
dotenv.config({path: configFile, silent: true})

export default {
  env: process.env.NODE_ENV || 'development',
  debug: process.env.NODE_ENV !== 'production',
  app: {
    name: process.env.APP_NAME || 'Plasma Chain',
    port: process.env.APP_PORT || 8080
  },
  chain: {
    web3Provider: 'http://localhost:8545',
    rootChainContract: '0xb4ee6879ba231824651991c8f0a34af4d6bfca6a',
    daggerEndpoint: 'mqtt://localhost:1883'
  }
}
