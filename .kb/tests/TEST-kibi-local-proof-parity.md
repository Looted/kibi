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
- `scripts/tests/proof-baseline-diff.test.ts`:
  - fingerprint and diff suite: baseline fingerprints skip not-applicable rows and sort gaps and symbols, requirement diffs name added gaps and uncovered symbols, and spawn output parses even when the checker exits non-zero;
  - semantic-only suite: stale receipts and the production-coverage gap they cause are set aside; a symbol with no `covered_by` link stays a real gap; grounding and contradiction regressions fail with stale evidence; new current requirements must join the baseline.

Run with `bun test ./scripts/tests/replay-proof-ci.test.ts ./scripts/tests/proof-baseline-diff.test.ts`.
