---
title: Local proof replay and semantic-only baseline contracts
status: passing
tags:
  - proof
  - tooling
  - unit
verification_scope: unit
verification_perspective: internal
id: TEST-kibi-local-proof-parity
type: test
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
## Test Coverage

- `scripts/tests/replay-proof-ci.test.ts`: the local replay derives the proof job's gate steps from `.github/workflows/proof.yml` in CI order, skips only host provisioning while keeping its repository-local `uv` commands, and fails loudly when a skipped step is renamed.
- `scripts/tests/proof-workflow-contract.test.ts`: the proof workflow runs the evidence-floor gate before executing contracts and again with `--fresh-evidence` after re-proving, the pre-push script ends with the same gate, and every current requirement in this repository needs tested evidence.

Run with `bun test ./scripts/tests/replay-proof-ci.test.ts ./scripts/tests/proof-workflow-contract.test.ts`.
