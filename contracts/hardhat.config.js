require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../.env" });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  networks: {
    // X Layer Mainnet — gas token: OKB
    xlayer: {
      url: process.env.RPC_URL || "https://rpc.xlayer.tech",
      chainId: 196,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
      // OKB is the native gas token — no special config needed
    },

    // X Layer Testnet (for pre-mainnet testing)
    xlayer_testnet: {
      url: "https://testrpc.xlayer.tech",
      chainId: 195,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },

    // Local hardhat node (for unit tests)
    hardhat: {
      chainId: 1337,
    },
  },

  // Etherscan / OKX Explorer verification
  etherscan: {
    apiKey: {
      xlayer: process.env.OKXSCAN_API_KEY || "placeholder",
    },
    customChains: [
      {
        network: "xlayer",
        chainId: 196,
        urls: {
          apiURL: "https://www.okx.com/explorer/xlayer/api",
          browserURL: "https://www.okx.com/explorer/xlayer",
        },
      },
    ],
  },
};
