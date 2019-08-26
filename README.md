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

## Linting (Solidity smart contracts)

In order to check code style rules match [solhint](https://github.com/protofire/solhint) conventions:

```
(venv) $ solhint -c .solhint.json contracts/InternetAccessETH.sol
```

## Linting, deploying & testing workflow

With ganache-cli running, one-liner:

```
(venv) $ npm run lint && node utils/deploy.js && npm run test
```

Sample output:

```
Compilation OK
Compilation OK
InternetAccess deployed on address 0xBD6EE51364a928bF53ccD392B79310852BeC2708
InternetAccessETH deployed on address 0x538bA2729884F87c4924f52B3718CeA7dae7Ca21


  Token smart contract tests
    ✓ Smart contract symbol should equal IntacTok (46ms)

  ETH smart contract tests
    ✓ Smart contract name should equal InternetAccessETH
    ✓ Should check if there's connection availability
    ✓ Should allow to require connection with ETH (75ms)
    ✓ Should allow to require a second connection with ETH and stake (70ms)
    ✓ Should allow two different users to require connection with ETH (116ms)
    ✓ Should revert connection request in case connections available exhausted (356ms)
    ✓ Should check there's no connection availability
    ✓ Should avoid non-owner to collect earnings
    ✓ Should avoid the owner to collect earnings before 24 hours (63ms)
    ✓ Should allow the owner to collect earnings after 24 hours (186ms)
    ✓ Should check there's connection availability again
    ✓ Should allow to require connection without stake and recover funds (103ms)
    ✓ Should avoid a user recovering funds after 24 hours (without stake) (100ms)
    ✓ Should allow the owner to collect earnings after 24 hours and one penalization attempt (68ms)
    ✓ Should allow to require connection with stake and penalize (170ms)
    ✓ Should allow the owner to collect unstaked earnings after 24 hours and one successful penalization (72ms)
    ✓ Should prevent staking a connection with more stake than available (154ms)
    ✓ Should allow the owner to collect all earnings available (99ms)
    ✓ Should allow the same user request different connection sessions (different locations?) (167ms)
    ✓ Should allow the owner to drain the contract again (90ms)


  18 passing (2s)
```
