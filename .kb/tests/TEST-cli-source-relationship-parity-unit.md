---
title: CLI source relationship parity unit contract
status: active
tags:
  - cli
  - relationships
  - parity
  - unit
verification_scope: unit
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-cli-source-relationship-parity-unit
      target: default
  success_policy: all_required_first_attempt
verification_perspective: internal
id: TEST-cli-source-relationship-parity-unit
type: test
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Directly exercises compiled relationship row parsing, the structural parity record contract, authored-to-compiled loss detection, and runtime-only reverse-ownership handling.