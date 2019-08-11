require('dotenv').config()

const CHAI = require('chai')
CHAI.should()

const WEB3_API = require('web3')
const WEB3_OPTIONS = { defaultGasPrice: 0, transactionConfirmationBlocks: 1 }
const WEB3 = new WEB3_API(`http://127.0.0.1:${process.env.GANACHE_PORT}`, null, WEB3_OPTIONS)
const FS = require('fs')

describe('ETH smart contract tests', function () {
  it('Smart contract name should equal InternetAccessETH', async () => {
    let abi = JSON.parse(FS.readFileSync('./contracts/abiETH.json', 'utf-8'))
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ETH_ADDRESS)
    let accounts = await WEB3.eth.getAccounts()
    accounts[0].should.be.a('string')
    let symbol = await contract.methods.name().call()
    symbol.should.be.a('string')
    symbol.should.equal('InternetAccessETH')
  })

  it('Should check if there\'s connection availability', async () => {
    let abi = JSON.parse(FS.readFileSync('./contracts/abiETH.json', 'utf-8'))
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ETH_ADDRESS)
    let connectionAvailable0 = await contract.methods.checkConnectionAvailable(0).call()
    connectionAvailable0.should.equal(true)
    let connectionAvailable100 = await contract.methods.checkConnectionAvailable(100).call()
    connectionAvailable100.should.equal(true)
    let connectionAvailable300 = await contract.methods.checkConnectionAvailable(300).call()
    connectionAvailable300.should.equal(true)
  })

  it('Should allow to require connection with ETH', async () => {
    let abi = JSON.parse(FS.readFileSync('./contracts/abiETH.json', 'utf-8'))
    let accounts = await WEB3.eth.getAccounts()
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ETH_ADDRESS)
    let previousBalance = await WEB3.eth.getBalance(process.env.CONTRACT_ETH_ADDRESS)
    previousBalance.should.equal('0')
    let connection = await contract.methods.reqConnectionWithETH().send(
      { from: accounts[1], value: 3000000000000000, gas: 1000000 })
    connection.should.have.property('events')
    connection.events.should.have.property('ConnectionRequest')
    connection.events.ConnectionRequest.returnValues._from.should.equal(accounts[1])
    let currentBalance = await WEB3.eth.getBalance(process.env.CONTRACT_ETH_ADDRESS)
    currentBalance.should.equal('3000000000000000')
  })
})
