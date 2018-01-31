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

// check for unhandledRejection
process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason)
})
