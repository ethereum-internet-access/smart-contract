require('dotenv').config()

const CHAI = require('chai')
CHAI.should()

const WEB3_API = require('web3')
const WEB3_OPTIONS = { defaultGasPrice: 0, transactionConfirmationBlocks: 1 }
const WEB3 = new WEB3_API(`http://127.0.0.1:${process.env.GANACHE_PORT}`, null, WEB3_OPTIONS)
const FS = require('fs')

const TIME_TRAVEL = (time) => {
  return new Promise((resolve, reject) => {
    WEB3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [time],
      id: new Date().getTime()
    }, (err, result) => {
      if (err) { return reject(err) }
      return resolve(result)
    })
  })
}

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

  it('Should allow to require a second connection with ETH and stake', async () => {
    let abi = JSON.parse(FS.readFileSync('./contracts/abiETH.json', 'utf-8'))
    let accounts = await WEB3.eth.getAccounts()
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ETH_ADDRESS)
    let previousBalance = await WEB3.eth.getBalance(process.env.CONTRACT_ETH_ADDRESS)
    previousBalance.should.equal('3000000000000000')
    let connection = await contract.methods.reqConnectionWithETH().send(
      { from: accounts[2], value: '2000000000000000', gas: '1000000' })
    connection.should.have.property('events')
    connection.events.should.have.property('ConnectionRequest')
    connection.events.ConnectionRequest.returnValues._from.should.equal(accounts[2])
    connection.events.ConnectionRequest.returnValues._stake.should.equal(true)
    connection.events.ConnectionRequest.returnValues._onFlyNumber.should.equal('1')
    let currentBalance = await WEB3.eth.getBalance(process.env.CONTRACT_ETH_ADDRESS)
    currentBalance.should.equal('5000000000000000')
  })

  it('Should allow two different users to require connection with ETH', async () => {
    let abi = JSON.parse(FS.readFileSync('./contracts/abiETH.json', 'utf-8'))
    let accounts = await WEB3.eth.getAccounts()
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ETH_ADDRESS)
    let connectionA = await contract.methods.reqConnectionWithETH().send(
      { from: accounts[3], value: '3000000000000000', gas: '1000000' })
    connectionA.should.have.property('events')
    connectionA.events.should.have.property('ConnectionRequest')
    connectionA.events.ConnectionRequest.returnValues._from.should.equal(accounts[3])
    connectionA.events.ConnectionRequest.returnValues._onFlyNumber.should.equal('2')
    connectionA.events.ConnectionRequest.returnValues._stake.should.equal(true)
    let connectionB = await contract.methods.reqConnectionWithETH().send(
      { from: accounts[4], value: '3000000000000000', gas: '1000000' })
    connectionB.should.have.property('events')
    connectionB.events.should.have.property('ConnectionRequest')
    connectionB.events.ConnectionRequest.returnValues._from.should.equal(accounts[4])
    connectionB.events.ConnectionRequest.returnValues._onFlyNumber.should.equal('3')
    connectionB.events.ConnectionRequest.returnValues._stake.should.equal(true)
  })

  it('Should revert connection request in case connections available exhausted', async () => {
    let abi = JSON.parse(FS.readFileSync('./contracts/abiETH.json', 'utf-8'))
    let accounts = await WEB3.eth.getAccounts()
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ETH_ADDRESS)
    for (let i = 4; i < 20; i++) {
      try {
        let connection = await contract.methods.reqConnectionWithETH().send(
          { from: accounts[i], value: '3000000000000000', gas: '1000000' })
        connection.events.ConnectionRequest.returnValues._onFlyNumber.should.equal(i.toString())
      } catch (error) {
        // Since previous test allocated 4 connections (0, 1, 2, 3) we have 6 left
        i.should.be.above(9)
      }
    }
  })

  it('Should avoid non-owner to collect earnings', async () => {
    let abi = JSON.parse(FS.readFileSync('./contracts/abiETH.json', 'utf-8'))
    let accounts = await WEB3.eth.getAccounts()
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ETH_ADDRESS)
    try {
      await contract.methods.collectEarnings('3000000000000000').send(
        { from: accounts[1], gas: '1000000' })
    } catch (err) {
      err.should.be.an('Error')
    }
  })

  it('Should avoid the owner to collect earnings before 24 hours', async () => {
    let abi = JSON.parse(FS.readFileSync('./contracts/abiETH.json', 'utf-8'))
    let accounts = await WEB3.eth.getAccounts()
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ETH_ADDRESS)
    await TIME_TRAVEL(12 * 3600)
    let previousBalance = await WEB3.eth.getBalance(accounts[0])
    let gasPrice = await WEB3.eth.getGasPrice()
    let collectResponse = await contract.methods.collectEarnings().send(
      { from: accounts[0], gas: '1000000' })
    console.log(gasPrice)
    console.log(JSON.stringify(collectResponse, null, 4))
    let currentBalance = await WEB3.eth.getBalance(accounts[0])
    currentBalance.should.equal(previousBalance)
    collectResponse.events.TotalEarningsCollection.returnValues._amount.should.equal('0')
    collectResponse.events.TotalEarningsCollection.returnValues._balance.should.equal('29000000000000000')
  })

  xit('Should allow the owner to collect earnings after 24 hours', async () => {
    await TIME_TRAVEL(36 * 3600)
    let abi = JSON.parse(FS.readFileSync('./contracts/abiETH.json', 'utf-8'))
    let accounts = await WEB3.eth.getAccounts()
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ETH_ADDRESS)
    let collectResponse = await contract.methods.collectEarnings().send(
      { from: accounts[0], gas: '1000000' })
    let counter = 0
    collectResponse.events.EarningsCollection.forEach(
      (x) => {
        let currentTimestamp = parseInt(x.returnValues._currentTimestamp)
        let connectionTimestamp = parseInt(x.returnValues._connectionTimestamp)
        let delta = currentTimestamp - connectionTimestamp
        delta.should.be.above(24 * 3600)
        counter++
        console.log(x.returnValues._amount)
        console.log(x.returnValues._balance)
      })
    console.log(JSON.stringify(collectResponse, null, 4))
    collectResponse.events.TotalEarningsCollection.returnValues._amount.should.equal('30000000000000000')
    collectResponse.events.TotalEarningsCollection.returnValues._balance.should.equal('30000000000000000')
    counter.should.equal(10)
  })
})
