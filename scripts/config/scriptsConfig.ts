import type { Config } from "../../src/kit/internal/types.js";

const config: Config = {
  networks: {
    localhost: {
      deploy: [
        {
          fqn_contractName: "HelloWorld",
          args: { args: ["Hello from deploy!", 42] },
        },
      ],
      initialize: [
        {
          fqn_contractName: "HelloWorld",
          function: "initialize",
          args: { args: ["Hello from initialize!", 99] },
        },
      ],
      verify: [],
    },
    sepolia: {
      deploy: [
        {
          fqn_contractName: "HelloWorld",
          args: { args: ["Hello from deploy!", 42] },
        },
      ],
      initialize: [
        {
          fqn_contractName: "HelloWorld",
          function: "initialize",
          args: { args: ["Hello from initialize!", 99] },
        },
      ],
      verify: ["ALL"],
    },
  },
};

export default config;
