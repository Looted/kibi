---
title: CLI supersedes source-history unit contract
status: active
source: packages/cli/tests/operations-mutation/mutation/relationships.test.ts
tags:
  - cli
  - git
  - supersedes
  - unit
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-cli-supersedes-history
      target: default
  success_policy: all_required_first_attempt
id: TEST-cli-supersedes-history-unit
type: test
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Executes Git addition-history lookup, supersession history classification, and the new-to-old source-history validation guard with deterministic repositories and ancestry fixtures.