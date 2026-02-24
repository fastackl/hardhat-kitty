# @fastackl/hardhat-kitty

Config-driven Hardhat 3 kit for contract `deploy`, `initialize`, and `verify` workflows.

It gives you:
- Hardhat tasks: `kit:deploy`, `kit:init`, `kit:verify`
- Programmatic functions: `deploy`, `testDeploy`, `initialize`, `testInitialize`, `verify`, `testVerify`
- Persistent deployment metadata saved to `deployments/*.json` for later initialization, verification, and tests

## Install

```bash
yarn add -D @fastackl/hardhat-kitty
```

## Hardhat Setup

In your `hardhat.config.ts`:

```ts
import { defineConfig } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { kitTasks } from "@fastackl/hardhat-kitty/hardhat";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthers],
  tasks: [...kitTasks],
});
```

## Scripts Config File

By default, the kit looks for config in this order:
- `scripts/config/scriptsConfig.ts`
- `scripts/config/scriptsConfig.js`
- `scripts.config.ts`
- `scripts.config.js`

You can always override with `KIT_CONFIG=<path>`.

Example `scripts/config/scriptsConfig.ts`:

```ts
import type { Config } from "@fastackl/hardhat-kitty/types";

const config: Config = {
  networks: {
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
```

### Config Notes

- `deploy[].fqn_contractName` is required; `fqn_filePath` and `fqn` are optional and auto-derived when omitted.
- `verify: ["ALL"]` verifies all contracts found in deployment metadata.
- Argument values support:
  - direct literals
  - contract address references like `"MyContract.address"`
  - signer references like `"SIGNER[0]"`

## Run Tasks

```bash
HARDHAT_NETWORK=sepolia yarn hardhat kit:deploy
HARDHAT_NETWORK=sepolia yarn hardhat kit:init
HARDHAT_NETWORK=sepolia yarn hardhat kit:verify
```

Optional env vars:
- `KIT_CONFIG=<path>`
- `SIGNERINDEX=<n>` (deploy/init)
- `ETHERNAL=true` (deploy only)
- `PRINT=true` (table-style output; avoid in non-interactive CI shells)

## Deployment Metadata

`kit:deploy` writes one JSON file per contract under `deployments/`:
- path: `deployments/<ContractName>.json`
- includes: `contractName`, `sourcePath`, `args`, `libraries`, `abi`, `buildTime`, `network`, `txHash`, `address`

`kit:init` and `kit:verify` consume this metadata automatically.

You can also read it in tests/scripts:

```ts
import { promises as fs } from "node:fs";
import path from "node:path";
import { ethers } from "hardhat";

const metadataPath = path.join(process.cwd(), "deployments", "HelloWorld.json");
const metadata = JSON.parse(await fs.readFile(metadataPath, "utf8"));

const hello = await ethers.getContractAt("HelloWorld", metadata.address);
```

## Use Programmatically in Tests

For Mocha/Chai tests, prefer `testDeploy` in setup (leaner and less likely to break from output/presentation behavior):

```ts
import { expect } from "chai";
import { ethers } from "hardhat";
import { testDeploy, initialize } from "@fastackl/hardhat-kitty";

describe("My flow", function () {
  before(async function () {
    await testDeploy(0, false, "scripts/config/scriptsConfig.ts");
    await initialize({
      configPath: "scripts/config/scriptsConfig.ts",
      signerIndex: 0,
      printTable: false,
    });
  });

  it("reads initialized state", async function () {
    // Replace with your deployed contract address/lookup.
    const hello = await ethers.getContractAt("HelloWorld", "0xYourAddress");
    expect(await hello.sayHello()).to.not.equal("");
  });
});
```

## Optional Path Customization

If your repo uses non-default directories, you can override internal paths:

```ts
import { setScriptPaths } from "@fastackl/hardhat-kitty";

setScriptPaths({
  deployments: "./custom-deployments",
  sources: "./src/contracts",
});
```

## Dev (this repo)

```bash
yarn typecheck
yarn test
yarn build
```