# internet-access-token

Smart contract to hold a token that can be exchanged for WiFi internet
access sharing services.

## Description

This repository contains Solidity source code of InternetAccessToken;
main smart contract, OpenZeppelin's SafeMath and Ownable under contracts
directory.

Inside utils directory there is a compile.js script that handles the compilation
of the contracts and a deploy.js script that automates the compilation and deployment
of the smart contract using a configurable Web3 provider.

## Tasks done:

- [x] Implemented main functions.
- [x] Compiled.
- [x] Used Doxity for documentation generation.

## Next steps:

- [ ] Make smart contract auditing.
- [ ] Make some tests, e.g., three tests for each function.

###### Useful links:

1. Remix Solidity IDE (to write and compile this smart contract): https://remix.ethereum.org
2. ETH faucets for the following testnets (to deploy this smart contract):
  - Ropsten: https://faucet.ropsten.be
  - Kovan (requires a GitHub account to login): https://faucet.kovan.network
  - Rinkeby: https://faucets.blockxlabs.com/ethereum
3. Documentation Generator for Solidity: https://github.com/DigixGlobal/doxity
4. Basic writing and formatting syntax (for this README): https://help.github.com/en/articles/basic-writing-and-formatting-syntax

## Installing dependencies locally

Using nodeenv-1.3.3 in order to avoid polluting the host NodeJS system:

```
$ sudo apt-get install python-pip
$ sudo pip install nodeenv
$ nodeenv --node 10.15.1 venv
$ source venv/bin/activate
(venv) $ npm install
```

## Configuration

File .env.sample contains sample configuration; copy it to .env and edit
its values to match your configuration:

- CONTRACT_PATH: Keep it as it is ./../contracts
- CONTRACT_ADDRESS: Keep it undefined, this variable is going to
be updated by the automated deploy script after deployment of the smart contract
- CONTRACT_ETH_ADDRESS: Keep it undefined, this variable is going to
be updated by the automated deploy script after deployment of the ETH smart contract
- GANACHE_PORT: Keep it on 8545
- MNEMONIC: Place here your development 12 words mnemonic

## Ganache deployment

```
(venv) $ npx ganache-cli --mnemonic 'Your 12 words mnemonic (same mnemonic on .env file)'
```

## Smart contract deployment over Ganache instance

Once ganache is running, open another terminal, configure
virtual environment and execute:

```
$ source venv/bin/activate
(venv) $ node utils/deploy.js
```

After the execution, check .env file contents in order to ensure CONTRACT_ADDRESS
has been updated with the current contract deployment address over Ganache.

Also check there's a new file inside contracts directory called abi.json containing
the Application Binary Interface JSON spec.

Both will be needed in order to live-test the contract using Mocha suite.

## Testing

Once the contract is properly deployed against Ganache and always with virtual environment:

```
(venv) $ npm run test
```

Currently in tests directory there's a main test file that performs a query to the contract
checking it's symbol name against the string 'IntacTok'.

## Linting

In order to check code style rules match StandardJS conventions:

```
(venv) $ npm run lint
```
