# Phase II Handoff Notes

This file is a temporary memory aid for migrating the current in-repo kit into a new dedicated plugin repository.

## Current state (what works)

- Core kit modules exist under `src/kit/core/`:
  - `configLoader.ts`
  - `deploy.ts`
  - `initialize.ts`
  - `verify.ts`
- Hardhat tasks exist under `src/kit/hardhat/`:
  - `registerTasks.ts`
  - `tasks/kitDeployTask.ts`
  - `tasks/kitInitTask.ts`
  - `tasks/kitVerifyTask.ts`
- Public exports exist at `src/kit/index.ts`.
- Legacy wrappers were removed from `scripts/` as part of plugin cleanup.
- Hardhat config registers kit tasks via:
  - `hardhat.config.ts` tasks: `[kitDeployTask, kitInitTask, kitVerifyTask]`

## Verified behavior

- Deploy and initialize worked on Sepolia with print output.
- Verify worked and returned "already verified" for deployed test address.
- `npx hardhat --help` (with supported Node runtime) lists:
  - `kit:deploy`
  - `kit:init`
  - `kit:verify`

## Important runtime note

- Hardhat 3 requires newer Node than v16.
- Known good runtime used during validation: `nvm use 22.10.0`.

## Current design caveat (why Phase II is needed)

- Core kit modules now import package-owned internals:
  - `src/kit/internal/utils.ts`
  - `src/kit/internal/types.ts`
- `scripts/` is now only used for default user config (`scripts/config/scriptsConfig.ts`).

## Phase II objective

Make this kit publish-ready and installable in external projects with no file copying:

1. `npm i -D <plugin-package>`
2. import plugin in consumer `hardhat.config.ts`
3. add local scripts config
4. run `kit:deploy`, `kit:init`, `kit:verify`

## Phase II checklist

1. Decouple from repo-local imports by moving needed utils/types/path logic into package-owned modules.
2. Finalize plugin entrypoint contract (`import "<pkg>/hardhat"` style or equivalent).
3. Add publish-ready package metadata (`exports`, build outputs, files list, peer deps).
4. Keep compatibility wrappers for existing script workflows.
5. Validate in a clean external consumer repo (install/import/run end-to-end).

## Useful commands

```bash
nvm use 22.10.0
PRINT=true HARDHAT_NETWORK=sepolia npx hardhat kit:deploy
PRINT=true HARDHAT_NETWORK=sepolia npx hardhat kit:init
PRINT=true HARDHAT_NETWORK=sepolia npx hardhat kit:verify
```

Optional env:

- `KIT_CONFIG=<path>`
- `SIGNERINDEX=<n>`
- `ETHERNAL=true` (deploy only)

## Agent identity and respawn

- Primary collaborator name: `VaultKit-Codex`
- Human project owner: `fastackl`

Use this prompt in the new repo to quickly resume context:

```text
You are continuing Phase II pluginization for fastackl.
Read src/kit/PHASE2_HANDOFF.md first and treat it as source of truth.
Goal: make this kit a publish-ready standalone Hardhat plugin package with no repo-local import coupling.
Preserve current deploy/init/verify behavior and task UX while completing the Phase II checklist.
```

