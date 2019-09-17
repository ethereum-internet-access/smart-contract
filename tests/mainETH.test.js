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
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    let accounts = await WEB3.eth.getAccounts()
    accounts[0].should.be.a('string')
    let symbol = await contract.methods.name().call()
    symbol.should.be.a('string')
    symbol.should.equal('InternetAccessETH')
  })

  it('Should check if there\'s connection availability', async () => {
    let abi = JSON.parse(FS.readFileSync('./contracts/abiETH.json', 'utf-8'))
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    let connectionAvailable = await contract.methods.checkConnectionAvailable().call()
    connectionAvailable.should.equal('0')
  })

  it('Should allow to require connection with ETH', async () => {
    let abi = JSON.parse(FS.readFileSync('./contracts/abiETH.json', 'utf-8'))
    let accounts = await WEB3.eth.getAccounts()
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    let previousBalance = await WEB3.eth.getBalance(process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    previousBalance.should.equal('0')
    let connection = await contract.methods.reqConnectionWithETH().send(
      { from: accounts[1], value: '4000000000000000', gas: '1000000' })
    connection.should.have.property('events')
    connection.events.should.have.property('ConnectionRequest')
    connection.events.ConnectionRequest.returnValues._from.should.equal(accounts[1])
    connection.events.ConnectionRequest.returnValues._stake.should.equal(false)
    connection.events.ConnectionRequest.returnValues._onFlyNumber.should.equal('0')
    let currentBalance = await WEB3.eth.getBalance(process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    currentBalance.should.equal('4000000000000000')
  })

  it('Should allow to require a second connection with ETH and stake', async () => {
    let abi = JSON.parse(FS.readFileSync('./contracts/abiETH.json', 'utf-8'))
    let accounts = await WEB3.eth.getAccounts()
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    let previousBalance = await WEB3.eth.getBalance(process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    previousBalance.should.equal('4000000000000000')
    let connection = await contract.methods.reqConnectionWithETH().send(
      { from: accounts[2], value: '2000000000000000', gas: '1000000' })
    connection.should.have.property('events')
    connection.events.should.have.property('ConnectionRequest')
    connection.events.ConnectionRequest.returnValues._from.should.equal(accounts[2])
    connection.events.ConnectionRequest.returnValues._stake.should.equal(true)
    connection.events.ConnectionRequest.returnValues._onFlyNumber.should.equal('1')
    let currentBalance = await WEB3.eth.getBalance(process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    currentBalance.should.equal('6000000000000000')
  })

  it('Should allow two different users to require connection with ETH', async () => {
    let abi = JSON.parse(FS.readFileSync('./contracts/abiETH.json', 'utf-8'))
    let accounts = await WEB3.eth.getAccounts()
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    let connectionA = await contract.methods.reqConnectionWithETH().send(
      { from: accounts[3], value: '3000000000000001', gas: '1000000' })
    connectionA.should.have.property('events')
    connectionA.events.should.have.property('ConnectionRequest')
    connectionA.events.ConnectionRequest.returnValues._from.should.equal(accounts[3])
    connectionA.events.ConnectionRequest.returnValues._onFlyNumber.should.equal('2')
    connectionA.events.ConnectionRequest.returnValues._stake.should.equal(true)
    let connectionB = await contract.methods.reqConnectionWithETH().send(
      { from: accounts[4], value: '3000000000000002', gas: '1000000' })
    connectionB.should.have.property('events')
    connectionB.events.should.have.property('ConnectionRequest')
    connectionB.events.ConnectionRequest.returnValues._from.should.equal(accounts[4])
    connectionB.events.ConnectionRequest.returnValues._onFlyNumber.should.equal('3')
    connectionB.events.ConnectionRequest.returnValues._stake.should.equal(true)
  })

  it('Should revert connection request in case connections available exhausted', async () => {
    let abi = JSON.parse(FS.readFileSync('./contracts/abiETH.json', 'utf-8'))
    let accounts = await WEB3.eth.getAccounts()
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    for (let i = 4; i < 20; i++) {
      try {
        let connection = await contract.methods.reqConnectionWithETH().send(
          { from: accounts[i], value: `300000000000000${i}`, gas: '1000000' })
        connection.events.ConnectionRequest.returnValues._onFlyNumber.should.equal(i.toString())
      } catch (error) {
        // Since previous test allocated 4 connections (0, 1, 2, 3) we have 6 left
        i.should.be.above(9)
      }
    }
  })

  it('Should check there\'s no connection availability', async () => {
    let abi = JSON.parse(FS.readFileSync('./contracts/abiETH.json', 'utf-8'))
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    let connectionAvailable = await contract.methods.checkConnectionAvailable().call()
    connectionAvailable.should.equal('-1')
  })

  it('Should avoid non-owner to collect earnings', async () => {
    let abi = JSON.parse(FS.readFileSync('./contracts/abiETH.json', 'utf-8'))
    let accounts = await WEB3.eth.getAccounts()
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
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
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    await TIME_TRAVEL(12 * 3600)
    let previousBalance = BigInt(await WEB3.eth.getBalance(accounts[0]))
    let gasPrice = BigInt(await WEB3.eth.getGasPrice())
    let collectResponse = await contract.methods.collectEarnings().send(
      { from: accounts[0], gas: '1000000' })
    let currentBalance = BigInt(await WEB3.eth.getBalance(accounts[0]))
    let cumulativeGasUsed = BigInt(collectResponse.cumulativeGasUsed)
    if (currentBalance !== previousBalance - gasPrice * cumulativeGasUsed) {
      // Due to https://github.com/chaijs/chai/issues/1195 ... chai cannot be used for this
      throw new Error('Current balance does not match previous one minus fee')
    }
    collectResponse.events.TotalEarningsCollection.returnValues._amount.should.equal('0')
  })

  it('Should allow the owner to collect earnings after 24 hours', async () => {
    await TIME_TRAVEL(36 * 3600)
    let abi = JSON.parse(FS.readFileSync('./contracts/abiETH.json', 'utf-8'))
    let accounts = await WEB3.eth.getAccounts()
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    let previousBalance = BigInt(await WEB3.eth.getBalance(accounts[0]))
    let collectResponse = await contract.methods.collectEarnings().send(
      { from: accounts[0], gas: '1000000' })
    let gasPrice = BigInt(await WEB3.eth.getGasPrice())
    let counter = 0
    collectResponse.events.EarningsCollection.forEach(
      (x) => {
        let currentTimestamp = parseInt(x.returnValues._currentTimestamp)
        let connectionTimestamp = parseInt(x.returnValues._connectionTimestamp)
        let delta = currentTimestamp - connectionTimestamp
        delta.should.be.above(24 * 3600)
        counter++
      })
    collectResponse.events.TotalEarningsCollection.returnValues._amount.should.equal('30000000000000042')
    collectResponse.events.TotalEarningsCollection.returnValues._balance.should.equal('30000000000000042')
    let stakeDue = await contract.methods.stakeDue().call()
    let contractCurrentBalance = await WEB3.eth.getBalance(process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    contractCurrentBalance.should.equal('0')
    stakeDue.should.equal('0')
    counter.should.equal(10)
    let cumulativeGasUsed = BigInt(collectResponse.cumulativeGasUsed)
    let currentBalance = BigInt(await WEB3.eth.getBalance(accounts[0]))
    let totalCollected = BigInt(collectResponse.events.TotalEarningsCollection.returnValues._amount)
    if (currentBalance !== previousBalance + totalCollected - gasPrice * cumulativeGasUsed) {
      // Due to https://github.com/chaijs/chai/issues/1195 ... chai cannot be used for this
      throw new Error('Current balance does not match previous plus total collected one minus fee')
    }
  })

  it('Should check there\'s connection availability again', async () => {
    let abi = JSON.parse(FS.readFileSync('./contracts/abiETH.json', 'utf-8'))
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    let connectionAvailable = await contract.methods.checkConnectionAvailable().call()
    connectionAvailable.should.equal('0')
  })

  it('Should allow to require connection without stake and recover funds', async () => {
    let abi = JSON.parse(FS.readFileSync('./contracts/abiETH.json', 'utf-8'))
    let accounts = await WEB3.eth.getAccounts()
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    let previousBalance = await WEB3.eth.getBalance(process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    previousBalance.should.equal('0')
    let connection = await contract.methods.reqConnectionWithETH().send(
      { from: accounts[1], value: '7000000000000000', gas: '1000000' })
    connection.should.have.property('events')
    connection.events.should.have.property('ConnectionRequest')
    connection.events.ConnectionRequest.returnValues._from.should.equal(accounts[1])
    connection.events.ConnectionRequest.returnValues._stake.should.equal(false)
    connection.events.ConnectionRequest.returnValues._onFlyNumber.should.equal('0')
    let currentContractBalance = await WEB3.eth.getBalance(process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    currentContractBalance.should.equal('7000000000000000')
    let previousUserBalance = BigInt(await WEB3.eth.getBalance(accounts[1]))
    let gasPrice = BigInt(await WEB3.eth.getGasPrice())
    let penalizeResponse = await contract.methods.penalize().send(
      { from: accounts[1], gas: '1000000' })
    let cumulativeGasUsed = BigInt(penalizeResponse.cumulativeGasUsed)
    let finalUserBalance = BigInt(await WEB3.eth.getBalance(accounts[1]))
    if (finalUserBalance !== previousUserBalance + BigInt('7000000000000000') - gasPrice * cumulativeGasUsed) {
      // Due to https://github.com/chaijs/chai/issues/1195 ... chai cannot be used for this
      throw new Error('Current user balance does not match previous plus refund minus penalize invocation fee')
    }
    let finalContractBalance = await WEB3.eth.getBalance(process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    finalContractBalance.should.equal('0')
  })

  it('Should avoid a user recovering funds after 24 hours (without stake)', async () => {
    let abi = JSON.parse(FS.readFileSync('./contracts/abiETH.json', 'utf-8'))
    let accounts = await WEB3.eth.getAccounts()
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    let previousBalance = await WEB3.eth.getBalance(process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    previousBalance.should.equal('0')
    let connection = await contract.methods.reqConnectionWithETH().send(
      { from: accounts[1], value: '7000000000000000', gas: '1000000' })
    connection.should.have.property('events')
    connection.events.should.have.property('ConnectionRequest')
    connection.events.ConnectionRequest.returnValues._from.should.equal(accounts[1])
    connection.events.ConnectionRequest.returnValues._stake.should.equal(false)
    connection.events.ConnectionRequest.returnValues._onFlyNumber.should.equal('0')
    await TIME_TRAVEL(36 * 3600)
    let currentContractBalance = await WEB3.eth.getBalance(process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    currentContractBalance.should.equal('7000000000000000')
    let previousUserBalance = BigInt(await WEB3.eth.getBalance(accounts[1]))
    let gasPrice = BigInt(await WEB3.eth.getGasPrice())
    let penalizeResponse = await contract.methods.penalize().send(
      { from: accounts[1], gas: '1000000' })
    let cumulativeGasUsed = BigInt(penalizeResponse.cumulativeGasUsed)
    let finalUserBalance = BigInt(await WEB3.eth.getBalance(accounts[1]))
    if (finalUserBalance !== previousUserBalance - gasPrice * cumulativeGasUsed) {
      // Due to https://github.com/chaijs/chai/issues/1195 ... chai cannot be used for this
      throw new Error('Current user balance does not match previous minus penalize invocation fee')
    }
    let finalContractBalance = await WEB3.eth.getBalance(process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    finalContractBalance.should.equal('7000000000000000')
  })

  it('Should allow the owner to collect earnings after 24 hours and one penalization attempt', async () => {
    let abi = JSON.parse(FS.readFileSync('./contracts/abiETH.json', 'utf-8'))
    let accounts = await WEB3.eth.getAccounts()
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    let previousBalance = BigInt(await WEB3.eth.getBalance(accounts[0]))
    let collectResponse = await contract.methods.collectEarnings().send(
      { from: accounts[0], gas: '1000000' })
    let gasPrice = BigInt(await WEB3.eth.getGasPrice())
    collectResponse.events.TotalEarningsCollection.returnValues._amount.should.equal('7000000000000000')
    collectResponse.events.TotalEarningsCollection.returnValues._balance.should.equal('7000000000000000')
    let stakeDue = await contract.methods.stakeDue().call()
    let contractCurrentBalance = await WEB3.eth.getBalance(process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    contractCurrentBalance.should.equal('0')
    stakeDue.should.equal('0')
    let cumulativeGasUsed = BigInt(collectResponse.cumulativeGasUsed)
    let currentBalance = BigInt(await WEB3.eth.getBalance(accounts[0]))
    let totalCollected = BigInt(collectResponse.events.TotalEarningsCollection.returnValues._amount)
    if (currentBalance !== previousBalance + totalCollected - gasPrice * cumulativeGasUsed) {
      // Due to https://github.com/chaijs/chai/issues/1195 ... chai cannot be used for this
      throw new Error('Current balance does not match previous plus total collected one minus fee')
    }
  })

  it('Should allow to require connection with stake and penalize', async () => {
    let abi = JSON.parse(FS.readFileSync('./contracts/abiETH.json', 'utf-8'))
    let accounts = await WEB3.eth.getAccounts()
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    let previousBalance = await WEB3.eth.getBalance(process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    previousBalance.should.equal('0')
    let firstConnection = await contract.methods.reqConnectionWithETH().send(
      { from: accounts[1], value: '7000000000000000', gas: '1000000' })
    firstConnection.events.ConnectionRequest.returnValues._stake.should.equal(false)
    let secondConnection = await contract.methods.reqConnectionWithETH().send(
      { from: accounts[2], value: '2000000000000000', gas: '1000000' })
    secondConnection.events.ConnectionRequest.returnValues._stake.should.equal(true)
    let currentContractBalance = await WEB3.eth.getBalance(process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    currentContractBalance.should.equal('9000000000000000')
    let previousOwnerBalance = await BigInt(await WEB3.eth.getBalance(accounts[0]))
    let previousFirstUserBalance = await BigInt(await WEB3.eth.getBalance(accounts[1]))
    let previousSecondUserBalance = await BigInt(await WEB3.eth.getBalance(accounts[2]))
    let previousStakeDue = await contract.methods.stakeDue().call()
    previousStakeDue.should.equal('2000000000000000')
    let penalizeResponse = await contract.methods.penalize().send(
      { from: accounts[2], gas: '1000000' })
    let cumulativeGasUsed = BigInt(penalizeResponse.cumulativeGasUsed)
    let gasPrice = BigInt(await WEB3.eth.getGasPrice())
    let finalContractBalance = await WEB3.eth.getBalance(process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    finalContractBalance.should.equal('7000000000000000')
    let finalOwnerBalance = await BigInt(await WEB3.eth.getBalance(accounts[0]))
    let finalFirstUserBalance = await BigInt(await WEB3.eth.getBalance(accounts[1]))
    let finalSecondUserBalance = await BigInt(await WEB3.eth.getBalance(accounts[2]))
    if (finalOwnerBalance !== previousOwnerBalance) {
      throw new Error('Owner\'s balance does not match')
    }
    if (finalFirstUserBalance !== previousFirstUserBalance) {
      throw new Error('Unstaked user balance does not match')
    }
    if (finalSecondUserBalance !== previousSecondUserBalance - gasPrice * cumulativeGasUsed) {
      throw new Error('Staked user balance does not match previous balance minus penalization fee')
    }
    let finalStakeDue = await contract.methods.stakeDue().call()
    finalStakeDue.should.equal('0')
  })

  it('Should allow the owner to collect unstaked earnings after 24 hours and one successful penalization', async () => {
    await TIME_TRAVEL(36 * 3600)
    let abi = JSON.parse(FS.readFileSync('./contracts/abiETH.json', 'utf-8'))
    let accounts = await WEB3.eth.getAccounts()
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    let previousBalance = BigInt(await WEB3.eth.getBalance(accounts[0]))
    let collectResponse = await contract.methods.collectEarnings().send(
      { from: accounts[0], gas: '1000000' })
    let gasPrice = BigInt(await WEB3.eth.getGasPrice())
    collectResponse.events.TotalEarningsCollection.returnValues._amount.should.equal('7000000000000000')
    collectResponse.events.TotalEarningsCollection.returnValues._balance.should.equal('7000000000000000')
    let stakeDue = await contract.methods.stakeDue().call()
    let contractCurrentBalance = await WEB3.eth.getBalance(process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    contractCurrentBalance.should.equal('0')
    stakeDue.should.equal('0')
    let cumulativeGasUsed = BigInt(collectResponse.cumulativeGasUsed)
    let currentBalance = BigInt(await WEB3.eth.getBalance(accounts[0]))
    let totalCollected = BigInt(collectResponse.events.TotalEarningsCollection.returnValues._amount)
    if (currentBalance !== previousBalance + totalCollected - gasPrice * cumulativeGasUsed) {
      // Due to https://github.com/chaijs/chai/issues/1195 ... chai cannot be used for this
      throw new Error('Current balance does not match previous plus total collected one minus fee')
    }
  })

  it('Should prevent staking a connection with more stake than available', async () => {
    let abi = JSON.parse(FS.readFileSync('./contracts/abiETH.json', 'utf-8'))
    let accounts = await WEB3.eth.getAccounts()
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    let previousBalance = await WEB3.eth.getBalance(process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    previousBalance.should.equal('0')
    let stakeDue = await contract.methods.stakeDue().call()
    stakeDue.should.equal('0')
    let firstConnection = await contract.methods.reqConnectionWithETH().send(
      { from: accounts[1], value: '7000000000000000', gas: '1000000' })
    stakeDue = await contract.methods.stakeDue().call()
    stakeDue.should.equal('0')
    firstConnection.events.ConnectionRequest.returnValues._stake.should.equal(false)
    let secondConnection = await contract.methods.reqConnectionWithETH().send(
      { from: accounts[2], value: '2000000000000000', gas: '1000000' })
    stakeDue = await contract.methods.stakeDue().call()
    stakeDue.should.equal('2000000000000000')
    secondConnection.events.ConnectionRequest.returnValues._stake.should.equal(true)
    let thirdConnection = await contract.methods.reqConnectionWithETH().send(
      { from: accounts[3], value: '90000000000000000', gas: '1000000' })
    stakeDue = await contract.methods.stakeDue().call()
    stakeDue.should.equal('2000000000000000')
    thirdConnection.events.ConnectionRequest.returnValues._stake.should.equal(false)
  })

  it('Should allow the owner to collect all earnings available', async () => {
    await TIME_TRAVEL(36 * 3600)
    let abi = JSON.parse(FS.readFileSync('./contracts/abiETH.json', 'utf-8'))
    let accounts = await WEB3.eth.getAccounts()
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    let previousBalance = BigInt(await WEB3.eth.getBalance(accounts[0]))
    let collectResponse = await contract.methods.collectEarnings().send(
      { from: accounts[0], gas: '1000000' })
    let gasPrice = BigInt(await WEB3.eth.getGasPrice())
    collectResponse.events.TotalEarningsCollection.returnValues._amount.should.equal('99000000000000000')
    collectResponse.events.TotalEarningsCollection.returnValues._balance.should.equal('99000000000000000')
    let stakeDue = await contract.methods.stakeDue().call()
    let contractCurrentBalance = await WEB3.eth.getBalance(process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    contractCurrentBalance.should.equal('0')
    stakeDue.should.equal('0')
    let cumulativeGasUsed = BigInt(collectResponse.cumulativeGasUsed)
    let currentBalance = BigInt(await WEB3.eth.getBalance(accounts[0]))
    let totalCollected = BigInt(collectResponse.events.TotalEarningsCollection.returnValues._amount)
    if (currentBalance !== previousBalance + totalCollected - gasPrice * cumulativeGasUsed) {
      // Due to https://github.com/chaijs/chai/issues/1195 ... chai cannot be used for this
      throw new Error('Current balance does not match previous plus total collected one minus fee')
    }
  })

  it('Should allow the same user request different connection sessions (different locations?)', async () => {
    let abi = JSON.parse(FS.readFileSync('./contracts/abiETH.json', 'utf-8'))
    let accounts = await WEB3.eth.getAccounts()
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    let previousBalance = await WEB3.eth.getBalance(process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    previousBalance.should.equal('0')
    let stakeDue = await contract.methods.stakeDue().call()
    stakeDue.should.equal('0')
    let firstConnection = await contract.methods.reqConnectionWithETH().send(
      { from: accounts[1], value: '7000000000000000', gas: '1000000' })
    stakeDue = await contract.methods.stakeDue().call()
    stakeDue.should.equal('0')
    firstConnection.events.ConnectionRequest.returnValues._stake.should.equal(false)
    let secondConnection = await contract.methods.reqConnectionWithETH().send(
      { from: accounts[1], value: '2000000000000000', gas: '1000000' })
    stakeDue = await contract.methods.stakeDue().call()
    stakeDue.should.equal('2000000000000000')
    secondConnection.events.ConnectionRequest.returnValues._stake.should.equal(true)
    let thirdConnection = await contract.methods.reqConnectionWithETH().send(
      { from: accounts[1], value: '90000000000000000', gas: '1000000' })
    stakeDue = await contract.methods.stakeDue().call()
    stakeDue.should.equal('2000000000000000')
    thirdConnection.events.ConnectionRequest.returnValues._stake.should.equal(false)
  })

  it('Should allow the owner to drain the contract again', async () => {
    await TIME_TRAVEL(36 * 3600)
    let abi = JSON.parse(FS.readFileSync('./contracts/abiETH.json', 'utf-8'))
    let accounts = await WEB3.eth.getAccounts()
    let contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    let previousBalance = BigInt(await WEB3.eth.getBalance(accounts[0]))
    let collectResponse = await contract.methods.collectEarnings().send(
      { from: accounts[0], gas: '1000000' })
    let gasPrice = BigInt(await WEB3.eth.getGasPrice())
    collectResponse.events.TotalEarningsCollection.returnValues._amount.should.equal('99000000000000000')
    collectResponse.events.TotalEarningsCollection.returnValues._balance.should.equal('99000000000000000')
    let stakeDue = await contract.methods.stakeDue().call()
    let contractCurrentBalance = await WEB3.eth.getBalance(process.env.CONTRACT_ETH_SIMPLE_ADDRESS)
    contractCurrentBalance.should.equal('0')
    stakeDue.should.equal('0')
    let cumulativeGasUsed = BigInt(collectResponse.cumulativeGasUsed)
    let currentBalance = BigInt(await WEB3.eth.getBalance(accounts[0]))
    let totalCollected = BigInt(collectResponse.events.TotalEarningsCollection.returnValues._amount)
    if (currentBalance !== previousBalance + totalCollected - gasPrice * cumulativeGasUsed) {
      // Due to https://github.com/chaijs/chai/issues/1195 ... chai cannot be used for this
      throw new Error('Current balance does not match previous plus total collected one minus fee')
    }
  })
})
