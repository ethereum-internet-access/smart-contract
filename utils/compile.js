require('dotenv').config()

const SOLC = require('solc')
const PATH = require('path')
const FS = require('fs')

const IAT_PATH = PATH.resolve(__dirname, process.env.CONTRACT_PATH, 'InternetAccessToken.sol')
const IAT_SRC = FS.readFileSync(IAT_PATH, 'utf-8')
const IAE_PATH = PATH.resolve(__dirname, process.env.CONTRACT_PATH, 'InternetAccessETHSimple.sol')
const IAE_SRC = FS.readFileSync(IAE_PATH, 'utf-8')
const SAFE_MATH_PATH = PATH.resolve(__dirname, process.env.CONTRACT_PATH, 'SafeMath.sol')
const SAFE_MATH_SRC = FS.readFileSync(SAFE_MATH_PATH, 'utf-8')
const OWNABLE_PATH = PATH.resolve(__dirname, process.env.CONTRACT_PATH, 'Ownable.sol')
const OWNABLE_SRC = FS.readFileSync(OWNABLE_PATH, 'utf-8')

const generateSource = () => {
  let init = OWNABLE_SRC + '\n' + IAT_SRC
  let src = ''
  init.split('\n').forEach(
    (x) => {
      if (!x.match(/import/) && !x.match(/pragma/)) {
        src += x + '\n'
      }
    })
  return SAFE_MATH_SRC + '\n' + src
}

const generateSourceETHSimple = () => {
  let init = OWNABLE_SRC + '\n' + IAE_SRC
  let src = ''
  init.split('\n').forEach(
    (x) => {
      if (!x.match(/import/) && !x.match(/pragma/)) {
        src += x + '\n'
      }
    })
  return SAFE_MATH_SRC + '\n' + src
}

const showErrors = (compilation) => {
  let errors = JSON.parse(compilation).errors
  if (errors) {
    console.log(`${errors.length} errors found`)
    for (let i = 0; i < errors.length; i++) {
      console.log(errors[i].formattedMessage)
    }
  } else {
    console.log('Compilation OK')
  }
}

const CONFIG = {
  language: 'Solidity',
  sources: {
    'iat': { content: generateSource() }
  },
  settings: {
    outputSelection: {
      '*': { '*': ['*'] }
    }
  }
}

const CONFIG_ETH_SIMPLE = {
  language: 'Solidity',
  sources: {
    'iaes': { content: generateSourceETHSimple() }
  },
  settings: {
    outputSelection: {
      '*': { '*': ['*'] }
    }
  }
}

const COMPILATION = SOLC.compile(JSON.stringify(CONFIG))
showErrors(COMPILATION)
const CONTRACTS = JSON.parse(COMPILATION).contracts
const COMPILATION_ETH_SIMPLE = SOLC.compile(JSON.stringify(CONFIG_ETH_SIMPLE))
showErrors(COMPILATION_ETH_SIMPLE)
const CONTRACTS_ETH_SIMPLE = JSON.parse(COMPILATION_ETH_SIMPLE).contracts

module.exports = { contracts: CONTRACTS, contractsETHSimple: CONTRACTS_ETH_SIMPLE }
