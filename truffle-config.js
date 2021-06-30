const path = require("path");

require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  contracts_build_directory: path.join(__dirname, "client/src/contracts"),
  networks: {
    develop: {
      port: 7545
    },

    ropsten: {
      provider: function() {
        return new HDWalletProvider(process.env.MNEMONIC, `https://ropsten.infura.io/v3/${process.env.INFURA_API_KEY}`)
      },
      gasPrice: 25000000000,
      network_id: "3",
    }
  },

  // Configure your compilers
  compilers: {
    solc: {
        version: "0.8.0",    // Fetch exact version from solc-bin (default: truffle's version)
      // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
        settings: {          // See the solidity docs for advice about optimization and evmVersion
        optimizer: {
          enabled: false,
          runs: 200
        },
      //  evmVersion: "byzantium"
        }
    }
  },
};
