---
title: Staged gate scratch store tests
status: active
priority: must
verification_scope: integration
tags:
  - check
  - staged
origin:
  kind: agent
  recorded_at: '2026-11-16T19:30:00.000Z'
id: TEST-staged-gate-scratch-store
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-staged-gate-scratch-store
      target: default
  success_policy: all_required_first_attempt
---
Checks that the staged gate's temporary store does not save after each write batch, that the evidence floor can be asked for named requirements only, and that the engine's scoped evidence floor evaluates only those requirements.