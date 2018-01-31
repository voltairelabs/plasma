import utils from 'ethereumjs-util'
import {Buffer} from 'safe-buffer'

import BlockHeader from './block-header'
import Transaction from './transaction'

const rlp = utils.rlp

export default class Block {
  constructor(data = [[], []]) {
    this.transactions = []

    if (Buffer.isBuffer(data)) {
      data = rlp.decode(data)
    }

    let rawTransactions = null
    if (Array.isArray(data)) {
      this.header = new BlockHeader(data[0])
      rawTransactions = data[1]
    } else {
      this.header = new BlockHeader(data.header)
      rawTransactions = data.transactions
    }

    // create transaction objects
    this.transactions = rawTransactions.map(r => new Transaction(r))
  }

  /**
   * Produces a hash the RLP of the block
   * @method hash
   */
  get hash() {
    return this.header.hash
  }

  get raw() {
    return this.serialize(false)
  }

  /**
   * Produces a serialization of the block.
   * @method serialize
   * @param {Boolean} rlpEncode whether to rlp encode the block or not
   */
  serialize(rlpEncode = true) {
    const txs = this.transactions.map(tx => tx.raw)
    const raw = [this.header.raw, txs]
    return rlpEncode ? rlp.encode(raw) : raw
  }

  /**
   * Converts the block toJSON
   * @method toJSON
   * @param {Bool} labeled whether to create an labeled object or an array
   * @return {Object}
   */
  toJSON(labeled = true) {
    if (!labeled) {
      return utils.baToJSON(this.raw)
    }

    return {
      hash: utils.bufferToHex(this.hash),
      header: this.header.toJSON(labeled),
      transactions: this.transactions.map(tx => tx.toJSON(labeled))
    }
  }

  async validate(chain) {}
}
