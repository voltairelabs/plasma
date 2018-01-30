require('babel-polyfill')
require('babel-register')

// start app
require('./server')

// setup chain
const chain = require('./chain').default
chain.start()

process.on('SIGINT', function() {
  console.log('Stoping plasma chain')
  chain.stop()
  process.exit()
})
