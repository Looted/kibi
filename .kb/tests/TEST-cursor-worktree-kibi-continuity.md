---
id: TEST-cursor-worktree-kibi-continuity
title: Cursor worktree continuity verification plan
type: test
status: passing
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
    - symbol_id: SYM-e2e-cursor-plugin-launcher
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-62d82e2fb1a6edf1743df18a
    test_id: TEST-cursor-worktree-kibi-continuity
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 0aac345636937bdd9ce5c4e2aa8db27285162f421f307d69df3fbd66ad5fbe68
    binding_hash: 6e6ed705ba2f0872dc2cdd6db0bff81f61860873645488f6acf1db145372bb47
    fingerprint: 6c65d7222ec22bd95e3fe85dced1940edecb8f0713acff4ec85e019186ac8b29
    fingerprint_components:
      contract: 0aac345636937bdd9ce5c4e2aa8db27285162f421f307d69df3fbd66ad5fbe68
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
      - symbol_id: SYM-e2e-cursor-plugin-launcher
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
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
