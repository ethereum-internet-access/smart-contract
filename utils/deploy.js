require('dotenv').config()

const COMPILE = require('./compile.js')
const WEB3_API = require('web3')
const CONTRACT = COMPILE.contracts.iat.InternetAccessToken
const BYTECODE = COMPILE.contracts.iat.InternetAccessToken.evm.bytecode.object
const CONTRACT_ETH = COMPILE.contractsETH.iae.InternetAccessETH
const BYTECODE_ETH = COMPILE.contractsETH.iae.InternetAccessETH.evm.bytecode.object
const ABI = JSON.stringify(JSON.parse(CONTRACT.metadata).output.abi)
const ABI_ETH = JSON.stringify(JSON.parse(CONTRACT_ETH.metadata).output.abi)
const FS = require('fs')

const updateEnvContractETHAddress = async (address) => {
  let oldEnv = FS.readFileSync('./.env', 'utf-8')
  let newEnv = ''
  oldEnv.split('\n').forEach((x) => {
    if (x.match(/CONTRACT_ETH_ADDRESS=/)) {
      newEnv = newEnv + `CONTRACT_ETH_ADDRESS=${address}` + '\n'
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
  let deployedETHContract = await new web3.eth.Contract(JSON.parse(ABI)).deploy({ data: BYTECODE_ETH }).send({ from: owner, gas: '5000000' })
  FS.writeFileSync('./contracts/abi.json', ABI)
  FS.writeFileSync('./contracts/abiETH.json', ABI_ETH)
  await updateEnvContractAddress(deployedContract.address)
  await updateEnvContractETHAddress(deployedETHContract.address)
  let contractName = await deployedContract.methods.name().call()
  console.log(`${contractName} deployed on address ${deployedContract.address}`)
  let contractETHName = await deployedETHContract.methods.name().call()
  console.log(`${contractETHName} deployed on address ${deployedETHContract.address}`)
}

deploy()
