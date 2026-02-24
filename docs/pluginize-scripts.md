# Pluginized Script Kit

This repo now supports a plugin-style workflow for deploy/initialize/verify so new projects can consume a package-like interface rather than copying script internals.

## What changed

- Core script runners are under `src/kit/core/`:
  - `deploy.ts`
  - `initialize.ts`
  - `verify.ts`
  - `configLoader.ts`
- Hardhat task registration is under `src/kit/hardhat/registerTasks.ts`.
- Script wrappers were removed; plugin tasks are the supported execution path.

## Commands

- `npx hardhat kit:deploy --network sepolia`
- `npx hardhat kit:init --network sepolia`
- `npx hardhat kit:verify --network sepolia`

Optional task arguments:

- `KIT_CONFIG=<path>`: custom scripts config location
- `PRINT=true`: enable preview/result table rendering
- `SIGNERINDEX=<n>` (deploy/init)
- `ETHERNAL=true` (deploy)

## New project adoption

1. Add this kit as a dependency (local package or published package).
2. Import task registration from your `hardhat.config.ts`.
3. Provide a project-local scripts config file.
4. Run kit tasks directly from Hardhat.

## Scaffold helper

Run:

- `npm run kit:init`

This generates a starter config at `scripts/config/scriptsConfig.ts` if missing.
