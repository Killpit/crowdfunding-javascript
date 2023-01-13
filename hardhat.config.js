/** @type import('hardhat/config').HardhatUserConfig */
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("@nomiclabs/hardhat-waffle");


module.exports = {
  solidity: "0.8.0",
};

require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.0",
  networks: {
    mainnet: {
      url: `https://api.avax.network/ext/bc/C/rpc`
        //accounts: [`${PRIVATE_KEY}`]
    },
    fuji: {
      url: `https://api.avax-test.network/ext/bc/C/rpc`
        //accounts: [`${PRIVATE_KEY}`]
    }
  }
};