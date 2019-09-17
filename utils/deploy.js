require('dotenv').config()

const COMPILE = require('./compile.js')
const WEB3_API = require('web3')
const CONTRACT = COMPILE.contracts.iat.InternetAccessToken
const BYTECODE = COMPILE.contracts.iat.InternetAccessToken.evm.bytecode.object
const CONTRACT_ETH_SIMPLE = COMPILE.contractsETHSimple.iaes.InternetAccessETHSimple
const BYTECODE_ETH_SIMPLE = COMPILE.contractsETHSimple.iaes.InternetAccessETHSimple.evm.bytecode.object
const ABI = JSON.stringify(JSON.parse(CONTRACT.metadata).output.abi)
const ABI_ETH = JSON.stringify(JSON.parse(CONTRACT_ETH_SIMPLE.metadata).output.abi)
const FS = require('fs')

const updateEnvContractETHSimpleAddress = async (address) => {
  let oldEnv = FS.readFileSync('./.env', 'utf-8')
  let newEnv = ''
  oldEnv.split('\n').forEach((x) => {
    if (x.match(/CONTRACT_ETH_SIMPLE_ADDRESS=/)) {
      newEnv = newEnv + `CONTRACT_ETH_SIMPLE_ADDRESS=${address}` + '\n'
    } else {
      newEnv = newEnv + x + '\n'
    }
  })
  FS.writeFileSync('./.env', newEnv)
}

const updateEnvContractAddress = async (address) => {
  let oldEnv = FS.readFileSync('./.env', 'utf-8')
  let newEnv = ''
  oldEnv.split('\n').forEach((x) => {
    if (x.match(/CONTRACT_ADDRESS=/)) {
      newEnv = newEnv + `CONTRACT_ADDRESS=${address}` + '\n'
    } else {
      newEnv = newEnv + x + '\n'
    }
  })
  FS.writeFileSync('./.env', newEnv)
}

const deploy = async () => {
  let options = {
    defaultGasPrice: 0,
    transactionConfirmationBlocks: 1
  }
  let web3 = new WEB3_API(`http://127.0.0.1:${process.env.GANACHE_PORT}`, null, options)
  let accounts = await web3.eth.getAccounts()
  let owner = accounts[0]
  let deployedContract = await new web3.eth.Contract(JSON.parse(ABI)).deploy({ data: BYTECODE }).send({ from: owner, gas: '5000000' })
  let deployedETHSimpleContract = await new web3.eth.Contract(JSON.parse(ABI)).deploy({ data: BYTECODE_ETH_SIMPLE }).send({ from: owner, gas: '5000000' })
  FS.writeFileSync('./contracts/abi.json', ABI)
  FS.writeFileSync('./contracts/abiETH.json', ABI_ETH)
  await updateEnvContractAddress(deployedContract._address)
  await updateEnvContractETHSimpleAddress(deployedETHSimpleContract._address)
  let contractName = await deployedContract.methods.name().call()
  console.log(`${contractName} deployed on address ${deployedContract._address}`)
  let contractETHName = await deployedETHSimpleContract.methods.name().call()
  console.log(`${contractETHName} deployed on address ${deployedETHSimpleContract._address}`)
}

deploy()
