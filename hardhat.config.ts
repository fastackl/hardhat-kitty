import { defineConfig, configVariable } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import dotenv from "dotenv";
import { kittyTasks } from "./src/hardhat.js";
dotenv.config();

export default defineConfig({
  plugins: [hardhatToolboxMochaEthers],
  tasks: [...kittyTasks],
  solidity: {
    compilers: [
      {
        version: "0.5.17",
        settings: {
          optimizer: { enabled: true, runs: 100 },
        },
      },
      {
        version: "0.6.8",
        settings: {
          optimizer: { enabled: true, runs: 100 },
        },
      },
      {
        version: "0.6.12",
        settings: {
          optimizer: { enabled: true, runs: 100 },
        },
      },
      {
        version: "0.7.6",
        settings: {
          optimizer: { enabled: true, runs: 100 },
        },
      },
      {
        version: "0.8.13",
        settings: {
          optimizer: { enabled: true, runs: 100 },
        },
      },
      {
        version: "0.8.14",
        settings: {
          optimizer: { enabled: true, runs: 100 },
        },
      },
      {
        version: "0.8.19",
        settings: {
          evmVersion: "london",
          optimizer: { enabled: true, runs: 100 },
        },
      },
    ],
  },
  networks: {
    localhost: {
      type: "http",
      chainType: "l1",
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: {
        mnemonic: configVariable("MNEMONIC"),
      },
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  test: {
    mocha: {
      timeout: 100000000,
    },
  },
  typechain: {
    outDir: "./typechain",
  },
  verify: {
    etherscan: {
      apiKey: configVariable("ETHERSCAN_API_KEY"),
    },
  },
});
