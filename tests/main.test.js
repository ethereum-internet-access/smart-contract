require('dotenv').config()

const CHAI = require('chai')
CHAI.should()

const WEB3_API = require('web3')
const WEB3 = new WEB3_API(`http://127.0.0.1:${process.env.GANACHE_PORT}`, null)
const FS = require('fs')

describe('Smart contract tests', function () {
  it('Smart contract symbol should equal IntacTok', async () => {
    let abi = JSON.parse(FS.readFileSync('./contracts/abi.json', 'utf-8'))
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ADDRESS)
    let accounts = await WEB3.eth.getAccounts()
    accounts[0].should.be.a('string')
    let symbol = await contract.methods.symbol().call()
    symbol.should.be.a('string')
    symbol.should.equal('IntacTok')
  })
})
