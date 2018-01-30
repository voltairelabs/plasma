import config from '../config'

class Chain {
  options = null

  constructor(options = {}) {
    this.options = options
  }

  addTransaction(tx) {}
}

export default new Chain(config.chain)
