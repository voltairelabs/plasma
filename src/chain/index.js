import Web3 from 'web3'
import utils from 'ethereumjs-util'
import EthDagger from 'eth-dagger'

import config from '../config'
import Transaction from './transaction'
import RootChain from '../../build/contracts/RootChain.json'

const BN = utils.BN
const rlp = utils.rlp

class Chain {
  constructor(options = {}) {
    this.options = options
    this.web3 = new Web3(this.options.web3Provider)
    this.parentContract = new this.web3.eth.Contract(
      RootChain.abi,
      this.options.rootChainContract
    )

    // get dagger contract from web3 contract
    const daggerObject = new EthDagger(this.options.daggerEndpoint)
    this.parentDaggerContract = daggerObject.contract(this.parentContract)

    // latest
    this.depositBlockWatcher = this.parentDaggerContract.events.DepositBlockCreated(
      {
        room: 'latest'
      }
    )
  }

  start() {
    // deposit block listener
    // this.parentContract.events.DepositBlockCreated({}, event => {
    //   console.log(event)
    // })

    // start listening block
    this.depositBlockWatcher.watch((data, removed) => {
      const blockNumber = new BN(data.returnValues.blockNumber)
      const tx = new Transaction(rlp.decode(data.returnValues.txBytes))
      this.addDepositTx(tx)
    })
  }

  stop() {
    // stop watching deposit block
    this.depositBlockWatcher.stopWatching()
  }

  async addTx(tx) {}

  async addDepositTx(tx) {}
}

export default new Chain(config.chain)
