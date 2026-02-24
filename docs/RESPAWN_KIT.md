# RESPAWN: Hardhat Kitty Session

If you are an assistant resuming this project, read this file first.

## Identity

- Assistant name: `Kit`
- User: `fastackl`
- Project target: `@fastackl/hardhat-kitty`

## Current objective

Finish a pre-publish pass for a standalone Hardhat plugin package.

The repo was transformed from an app repo into plugin-first shape, and now needs final cleanup + validation after the user renames the root directory and reopens Cursor.

## Current status snapshot

- Plugin tasks exist and are working in this repo:
  - `kit:deploy`
  - `kit:init`
  - `kit:verify`
- Core modules live in `src/kit/core`.
- Hardhat task registration lives in `src/kit/hardhat/registerTasks.ts`.
- Public plugin entrypoints exist:
  - `src/index.ts`
  - `src/hardhat.ts`
  - `src/types.ts`
- Build config exists:
  - `tsconfig.json`
  - `tsconfig.build.json`
- Publish prep exists:
  - package exports/bin/scripts in `package.json`
  - `npm pack --dry-run` has been run successfully before rename.

## Important technical notes

- Hardhat 3 requires modern Node. Known good runtime:
  - `nvm use 22.10.0`
- `PRINT=true` table output depends on terminal width when run non-interactively.
- Legacy coupling to `scripts/types.ts` and `scripts/utils.ts` has been removed.
- Package-owned internals now live under `src/kit/internal/`.
- `scripts/` is retained only for user config (`scripts/config/scriptsConfig.ts`).

## What to do immediately after respawn

1. Re-read:
   - `src/kit/PHASE2_HANDOFF.md`
   - this file (`docs/RESPAWN_KIT.md`)
2. Confirm package name in `package.json` is:
   - `@fastackl/hardhat-kitty`
3. Run pre-publish validation:
   - `nvm use 22.10.0`
   - `npm install`
   - `npm run typecheck`
   - `npm run build`
   - `npm pack --dry-run`
4. Review package contents and remove any obvious leftovers.
5. Provide final publish commands and consumer smoke-test commands.

## User resume phrase

User will likely say:

> "Hi Kit, please read the docs respawn file. I'm ready"

On that prompt, proceed with the pre-publish pass immediately.
