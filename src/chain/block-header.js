import utils from 'ethereumjs-util'
import {Buffer} from 'safe-buffer'

const getFields = () => [
  {
    name: 'number',
    default: Buffer.alloc(0)
  },
  {
    name: 'root',
    length: 32,
    default: utils.SHA3_RLP
  },
  {
    name: 'createdAt',
    default: Buffer.alloc(0)
  }
]

export default class BlockHeader {
  constructor(data) {
    utils.defineProperties(this, getFields(), data)
  }

  get hash() {
    // ignore createdAt for calculating hash
    return utils.rlphash(this.raw.slice(0, this.raw.length - 1))
  }
}
