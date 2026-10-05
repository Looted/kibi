---
id: TEST-cursor-worktree-kibi-continuity
title: Cursor worktree continuity verification plan
type: test
status: pending
created_at: 2026-07-21T00:00:00.000Z
updated_at: 2026-07-21T00:00:00.000Z
priority: must
tags:
  - cursor
  - worktree
  - mcp
  - cli
  - policy
  - test
links:
  - type: validates
    target: SCEN-cursor-worktree-kibi-continuity
  - type: relates_to
    target: ADR-022
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-cursor-worktree-kibi-continuity
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-9da72272b0d95d415c9bbd8f
    test_id: TEST-cursor-worktree-kibi-continuity
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: ba3eaea10577f08000c084f86c1a1baf3d1777378b2c4bb9b056a18475562640
    binding_hash: 6fc38385e25adec20c356d9a3a5fd248523f93520857c8399d1d4194baaa0b69
    fingerprint: d92be0f81481f0a646e93d21227eee753aa6010ad82dee8da2547fe5c5cebf77
    fingerprint_components:
      contract: ba3eaea10577f08000c084f86c1a1baf3d1777378b2c4bb9b056a18475562640
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-test-cursor-worktree-kibi-continuity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
## Test Coverage

### Policy Checks

- The worktree continuity requirement stays linked to the new parity ADR.
- The scenario and test remain stable across worktree handoffs.
- The docs preserve history while keeping the current surface model readable.
