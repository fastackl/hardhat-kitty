import type { Config } from "../../src/kit/internal/types.js";

const config: Config = {
  networks: {
    localhost: {
      deploy: [
        // Implicit fqn_filePath + fqn (auto-derived from contract name)
        {
          fqn_contractName: "HelloWorld",
          args: { args: ["Hello from deploy!", 42] },
        },
        // Explicit fqn_filePath + fqn (fully specified)
        {
          fqn_contractName: "ConfigShowcase",
          fqn_filePath: "contracts/ConfigShowcase.sol",
          fqn: "contracts/ConfigShowcase.sol:ConfigShowcase",
          args: {
            args: ["HelloWorld.address", "SIGNER[0]", "local config showcase", 1],
          },
        },
      ],
      initialize: [
        {
          fqn_contractName: "HelloWorld",
          function: "initialize",
          args: { args: ["Hello from initialize!", 99] },
        },
        {
          fqn_contractName: "ConfigShowcase",
          function: "initialize",
          args: {
            args: ["HelloWorld.address", "SIGNER[0]", "local initialized", 2],
          },
        },
      ],
      verify: [],
    },
    sepolia: {
      deploy: [
        // Implicit fqn_filePath + fqn (auto-derived from contract name)
        {
          fqn_contractName: "HelloWorld",
          args: { args: ["Hello from deploy!", 42] },
        },
        // Explicit fqn_filePath + fqn (fully specified)
        {
          fqn_contractName: "ConfigShowcase",
          fqn_filePath: "contracts/ConfigShowcase.sol",
          fqn: "contracts/ConfigShowcase.sol:ConfigShowcase",
          args: {
            args: ["HelloWorld.address", "SIGNER[0]", "sepolia config showcase", 1],
          },
        },
      ],
      initialize: [
        {
          fqn_contractName: "HelloWorld",
          function: "initialize",
          args: { args: ["Hello from initialize!", 99] },
        },
        {
          fqn_contractName: "ConfigShowcase",
          function: "initialize",
          args: {
            args: ["HelloWorld.address", "SIGNER[0]", "sepolia initialized", 2],
          },
        },
      ],
      verify: ["ALL"],
    },
  },
};

export default config;
