import Web3 from 'web3'
import utils from 'ethereumjs-util'
import EthDagger from 'eth-dagger'
import level from 'level'

import config from '../config'
import Block from './block'

import RootChain from '../../build/contracts/RootChain.json'

const BN = utils.BN
const rlp = utils.rlp

class Chain {
  constructor(options = {}) {
    this.options = options
    this.blockDb = level(`${this.options.db}/block`)
    this.detailsDb = level(`${this.options.db}/details`)

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
    // start listening block
    this.depositBlockWatcher.watch((data, removed) => {
      const {blockNumber, root, txBytes} = data.returnValues
      this.addDepositBlock(
        [
          new BN(blockNumber).toArrayLike(Buffer, 'be', 32),
          utils.toBuffer(root)
        ], // header
        [rlp.decode(data.returnValues.txBytes)] // tx list
      )
    })
  }

  stop() {
    // stop watching deposit block
    this.depositBlockWatcher.stopWatching()
  }

  async addTx(tx) {}

  async addDepositBlock(header, txs) {
    const depositBlock = new Block([header, txs])
    await this.putBlock(depositBlock)
  }

  /**
   *Gets a block by its hash
   * @method getBlock
   * @param {String|Buffer|Number} hash - the sha256 hash of the rlp encoding of the block
   */
  async getBlock(blockTag) {
    const lookupByHash = hash => {
      return this.blockDb
        .get(hash, {
          keyEncoding: 'binary',
          valueEncoding: 'binary'
        })
        .then(encodedBlock => {
          return new Block(rlp.decode(encodedBlock))
        })
    }

    const lookupNumberToHash = hexString => {
      const key = new BN(hexString).toString()
      return this.detailsDb.get(key, {
        valueEncoding: 'binary'
      })
    }

    // determine BlockTag type
    if (Buffer.isBuffer(blockTag)) {
      return await lookupByHash(blockTag)
    }

    if (/^[0-9]+$/gi.test(String(blockTag))) {
      const blockHash = await lookupNumberToHash(blockTag)
      return await lookupByHash(blockHash)
    }

    return null
  }

  /**
   * Gets a block by its hash
   * @method getBlockInfo
   * @param {String} hash - the sha256 hash of the rlp encoding of the block
   */
  async getDetails(hash) {
    return await this.detailsDb.get('detail:' + hash.toString('hex'), {
      valueEncoding: 'json'
    })
  }

  /**
   * Adds many blocks to the blockchain
   * @method putBlocks
   * @param {array} blocks - the blocks to be added to the blockchain
   */
  async putBlocks(blocks) {
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i]
      await this.putBlock(b)
    }
  }

  /**
   * Adds a block to the blockchain
   * @method putBlock
   * @param {object} block -the block to be added to the block chain
   */
  async putBlock(blockObj) {
    let block = blockObj
    if (!(block instanceof Block)) {
      block = new Block(block)
    }

    const blockHash = block.hash
    const blockHashHexString = blockHash.toString('hex')
    const dbOps = []

    if (!this.validate) {
      const message = await block.validate(this)
      if (message) {
        throw new Error(message)
      }
    }

    // store the block details
    const blockDetails = {
      hash: blockHashHexString,
      header: block.header.toJSON(true)
    }

    // block details
    dbOps.push({
      db: 'details',
      type: 'put',
      key: 'detail:' + blockHashHexString,
      valueEncoding: 'json',
      value: blockDetails
    })

    // serialize block and store to db
    dbOps.push({
      db: 'block',
      type: 'put',
      key: blockHash,
      keyEncoding: 'binary',
      valueEncoding: 'binary',
      value: block.serialize()
    })

    // index by number
    const blockNumber = new BN(block.header.number).toString()
    dbOps.push({
      db: 'details',
      type: 'put',
      key: blockNumber,
      valueEncoding: 'binary',
      value: blockHash
    })

    await this._batchDbOps(dbOps)
  }

  async _batchDbOps(dbOps) {
    const blockDbOps = []
    const detailsDbOps = []
    dbOps.forEach(op => {
      switch (op.db) {
        case 'block':
          blockDbOps.push(op)
          break
        case 'details':
          detailsDbOps.push(op)
          break
        default:
          throw new Error('DB op did not specify known db:', op)
      }
    })

    return await Promise.all([
      this.blockDb.batch(blockDbOps),
      this.detailsDb.batch(detailsDbOps)
    ])
  }
}

export default new Chain(config.chain)
