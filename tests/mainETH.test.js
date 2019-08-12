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
    let connectionAvailable = await contract.methods.checkConnectionAvailable().call()
    connectionAvailable.should.equal('0')
  })

  it('Should allow to require connection with ETH', async () => {
    let abi = JSON.parse(FS.readFileSync('./contracts/abiETH.json', 'utf-8'))
    let accounts = await WEB3.eth.getAccounts()
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ETH_ADDRESS)
    let previousBalance = await WEB3.eth.getBalance(process.env.CONTRACT_ETH_ADDRESS)
    previousBalance.should.equal('0')
    let connection = await contract.methods.reqConnectionWithETH().send(
      { from: accounts[1], value: '3000000000000000', gas: '1000000' })
    connection.should.have.property('events')
    connection.events.should.have.property('ConnectionRequest')
    connection.events.ConnectionRequest.returnValues._from.should.equal(accounts[1])
    connection.events.ConnectionRequest.returnValues._stake.should.equal(false)
    connection.events.ConnectionRequest.returnValues._onFlyNumber.should.equal('0')
    let currentBalance = await WEB3.eth.getBalance(process.env.CONTRACT_ETH_ADDRESS)
    currentBalance.should.equal('3000000000000000')
  })

  it('Should allow two different users to require connection with ETH', async () => {
    let abi = JSON.parse(FS.readFileSync('./contracts/abiETH.json', 'utf-8'))
    let accounts = await WEB3.eth.getAccounts()
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ETH_ADDRESS)
    let connectionA = await contract.methods.reqConnectionWithETH().send(
      { from: accounts[1], value: '3000000000000000', gas: '1000000' })
    connectionA.should.have.property('events')
    connectionA.events.should.have.property('ConnectionRequest')
    connectionA.events.ConnectionRequest.returnValues._from.should.equal(accounts[1])
    connectionA.events.ConnectionRequest.returnValues._onFlyNumber.should.equal('1')
    connectionA.events.ConnectionRequest.returnValues._stake.should.equal(true)
    let connectionB = await contract.methods.reqConnectionWithETH().send(
      { from: accounts[2], value: '3000000000000000', gas: '1000000' })
    connectionB.should.have.property('events')
    connectionB.events.should.have.property('ConnectionRequest')
    connectionB.events.ConnectionRequest.returnValues._from.should.equal(accounts[2])
    connectionB.events.ConnectionRequest.returnValues._onFlyNumber.should.equal('2')
    connectionB.events.ConnectionRequest.returnValues._stake.should.equal(true)
  })

  it('Should revert connection request in case connections available exhausted', async () => {
    let abi = JSON.parse(FS.readFileSync('./contracts/abiETH.json', 'utf-8'))
    let accounts = await WEB3.eth.getAccounts()
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ETH_ADDRESS)
    for (let i = 0; i < 10; i++) {
      try {
        let connection = await contract.methods.reqConnectionWithETH().send(
          { from: accounts[i], value: '3000000000000000', gas: '1000000' })
        connection.events.ConnectionRequest.returnValues._onFlyNumber.should.equal((3 + i).toString())
      } catch (error) {
        // Since previous test allocated 3 connections (0, 1, 2) we have 7 left
        i.should.be.above(6)
      }
    }
  })
})
