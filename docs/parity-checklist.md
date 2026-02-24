# Script Parity Checklist

Use this checklist to validate expected behavior of kit tasks (`kit:*`) before publishing.

## Deploy parity

- Run `npx hardhat kit:deploy --network localhost`
- Confirm:
  - archive old outputs when `deployments/` is populated
  - auto-compile before deployment
  - write `deployments/<Contract>.json` with equivalent metadata shape
  - resolve `.address` and `SIGNER[n]` references

## Initialize parity

- Run `npx hardhat kit:init --network localhost`
- Confirm:
  - load metadata from `deployments/`
  - call configured functions in the same order
  - accept signer selection via env or arg

## Verify parity

- Run `npx hardhat kit:verify --network sepolia`
- Confirm:
  - use deployment metadata for address/constructor args/libraries
  - support `verify: ["ALL"]`

## Output parity

- Compare preview/results output with and without `PRINT=true` / `--print`.
- Confirm kit task termination messages and non-zero exit on failure behavior.
