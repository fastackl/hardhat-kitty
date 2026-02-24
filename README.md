# kitty-hardhat-plugin

Reusable Hardhat 3 task kit for config-driven contract deployment, initialization, and verification.

## Install

```bash
npm i -D kitty-hardhat-plugin
```

## Consumer setup

In `hardhat.config.ts`:

```ts
import { defineConfig } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { kitTasks } from "kitty-hardhat-plugin/hardhat";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthers],
  tasks: [...kitTasks],
});
```

Create your config file in your consuming project (default lookup path):

- `scripts/config/scriptsConfig.ts`

or override path at runtime with `KIT_CONFIG=<path>`.

## Commands

```bash
PRINT=true HARDHAT_NETWORK=sepolia npx hardhat kit:deploy
PRINT=true HARDHAT_NETWORK=sepolia npx hardhat kit:init
PRINT=true HARDHAT_NETWORK=sepolia npx hardhat kit:verify
```

Optional env vars:

- `KIT_CONFIG=<path>`
- `SIGNERINDEX=<n>` (deploy/init)
- `ETHERNAL=true` (deploy only)

## Dev

```bash
npm run typecheck
npm run build
```