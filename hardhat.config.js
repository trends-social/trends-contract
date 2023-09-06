/** @type import('hardhat/config').HardhatUserConfig */
require('@nomiclabs/hardhat-truffle5');
require('solidity-coverage')
require("hardhat-gas-reporter");

module.exports = {
    solidity: "0.8.17",
    gasReporter: {
        enabled: true
    },
    settings: {
        optimizer: {
            enabled: true
        },
    },
};
