import timestamp from 'monotonic-timestamp'
import {Buffer} from 'safe-buffer'
import Transaction from './transaction'
import utils from 'ethereumjs-util'

export default class TxPool {
  constructor(db) {
    this.db = db
  }

  async push(tx) {
    const ts = timestamp()
    await this.db.put(Buffer.from(`tx-${ts}`), tx.serializeTx(true))
  }

  async getTxs() {
    const values = []
    await new Promise((resolve, reject) => {
      this.db
        .createReadStream()
        .on('data', data => {
          values.push(new Transaction(data.value))
        })
        .on('error', err => {
          reject(err)
        })
        .on('end', () => {
          resolve()
        })
    })
    return values
  }

  async popTxs() {
    const batch = this.db.batch()
    const result = []
    await new Promise((resolve, reject) => {
      this.db
        .createReadStream()
        .on('data', data => {
          result.push(new Transaction(data.value))
          batch.del(data.key)
        })
        .on('error', err => {
          reject(err)
        })
        .on('end', () => {
          resolve()
        })
    })
    await batch.write()
    return result
  }
}
