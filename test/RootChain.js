/* global assert */

import utils from 'ethereumjs-util'

import assertRevert from './helpers/assertRevert'
import {mineToBlockHeight} from './helpers/utils'

// import chain components
import Transaction from '../src/chain/transaction'
import FixedMerkleTree from '../src/lib/fixed-merkle-tree'

// require root chain
let RootChain = artifacts.require('./RootChain.sol')

const BN = utils.BN
const rlp = utils.rlp
const keyPair = require('./keypair')
keyPair.key1 = utils.toBuffer(keyPair.key1)

contract('Root chain', function(accounts) {
  describe('deposit and start withdraw:', async function() {
    const value = new BN(web3.toWei(1, 'ether'))

    let rootChain
    let owner
    let depositTx

    // before task
    before(async function() {
      rootChain = await RootChain.new({from: accounts[0]})
      owner = keyPair.address1 // same as accounts[0]
    })

    it('should allow user to deposit ETH into plasma chain', async function() {
      depositTx = new Transaction([
        new Buffer([]), // block number 1
        new Buffer([]), // tx number 1
        new Buffer([]), // previous output number 1 (input 1)
        new Buffer([]), // block number 2
        new Buffer([]), // tx number 2
        new Buffer([]), // previous output number 2 (input 2)

        utils.toBuffer(owner), // output address 1
        value.toArrayLike(Buffer, 'be', 32), // value for output 2

        utils.zeros(20), // output address 2
        new Buffer([]), // value for output 2

        new Buffer([]) // fee
      ])

      // serialize tx bytes
      const txBytes = utils.bufferToHex(depositTx.serializeTx())

      // deposit
      const receipt = await rootChain.deposit(txBytes, {
        from: owner,
        value: value
      })

      assert.equal(receipt.logs.length, 1)
      assert.equal(receipt.logs[0].event, 'Deposit')
      assert.equal(receipt.logs[0].args.depositor, owner)
      assert.equal(receipt.logs[0].args.amount.toString(), value.toString())
    })

    it('should allow user to start withdraw ETH from plasma chain', async function() {
      const value = new BN(web3.toWei(1, 'ether'))

      // serialize tx bytes
      const txBytes = utils.bufferToHex(depositTx.serializeTx())

      // deposit
      let [childChainRoot, t] = await rootChain.getChildChain(1)
      childChainRoot = utils.toBuffer(childChainRoot)

      // generate proof
      const merkleHash = depositTx.merkleHash()
      // depositTx.sign1(keyPair.key1) // sign1
      // depositTx.sign2(keyPair.key2) // sign2
      const tree = new FixedMerkleTree(16, [merkleHash])
      const proof = utils.bufferToHex(
        Buffer.concat(tree.getPlasmaProof(merkleHash))
      )
      const sigs = utils.bufferToHex(
        Buffer.concat([
          depositTx.sig1,
          depositTx.sig2,
          depositTx.confirmSig(childChainRoot, keyPair.key1)
        ])
      )

      const receipt = await rootChain.startExit(
        [1, 0, 0], // [blockNumber, txNumber, oIndex]
        txBytes,
        proof,
        sigs,
        {
          from: owner
        }
      )

      const priority = 1 * 1000000000 + 10000 * 0 + 0
      const [user, amount, pos] = await rootChain.getExit(priority)
      assert.equal(user, owner)
      assert.equal(amount.toString(), value)
      assert.deepEqual([1, 0, 0], pos.map(p => p.toNumber()))

      // trying again shoul fail
      await assertRevert(
        rootChain.startExit(
          [1, 0, 0], // [blockNumber, txNumber, oIndex]
          txBytes,
          proof,
          sigs,
          {
            from: owner
          }
        )
      )
    })

    it('should allow user to create new UTXO from UTXO', async function() {
      let transferTx = new Transaction([
        utils.toBuffer(1), // block number for first input
        new Buffer([]), // tx number for 1st input
        new Buffer([]), // previous output number 1 (as 1st input)
        new Buffer([]), // block number 2
        new Buffer([]), // tx number 2
        new Buffer([]), // previous output number 2 (as 2nd input)

        utils.toBuffer(owner), // output address 1
        value.toArrayLike(Buffer, 'be', 32), // value for output 2

        utils.zeros(20), // output address 2
        new Buffer([]), // value for output 2

        new Buffer([]) // fee
      ])

      // serialize tx bytes
      const transferTxBytes = utils.bufferToHex(transferTx.serializeTx())

      // generate proof
      transferTx.sign1(keyPair.key1) // sign1
      // transferTx.sign2(keyPair.key2) // sign2
      const merkleHash = transferTx.merkleHash()
      const tree = new FixedMerkleTree(16, [merkleHash])
      const proof = utils.bufferToHex(
        Buffer.concat(tree.getPlasmaProof(merkleHash))
      )

      // submit new block - must throw before atleast 6 blocks
      await assertRevert(
        rootChain.submitBlock(utils.bufferToHex(tree.getRoot()))
      )

      // mine 7 more blocks
      const oldChildBlockNumber = (await rootChain.currentChildBlock()).toNumber()
      const lastBlock = web3.eth.blockNumber
      await mineToBlockHeight(web3.eth.blockNumber + 7)

      // try again by submitting block
      const receipt = await rootChain.submitBlock(
        utils.bufferToHex(tree.getRoot())
      )

      assert.equal(
        (await rootChain.currentChildBlock()).toNumber(),
        oldChildBlockNumber + 1
      )
    })
  })
})
