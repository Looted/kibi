---
title: CLI workspace snapshot relevance regression
status: active
tags:
  - cli
  - verification
  - snapshot
  - unit
verification_scope: unit
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-cli-workspace-snapshot-dirtiness
      target: default
  success_policy: all_required_first_attempt
verification_perspective: internal
id: TEST-cli-workspace-snapshot-dirtiness
type: test
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b9357937bf9611e1f4e3f7e5
    test_id: TEST-cli-workspace-snapshot-dirtiness
    scope: unit
    outcome: passed
    code_snapshot: cffe41b11590abbf5935d229d1c33d882718eab1b065285a913e2254bd9e5828
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-25T12:36:16.131Z'
    finished_at: '2026-10-25T12:36:16.561Z'
    artifact_digest: ced03d7ce9ec15c88589e0c42b752fb8b34c1e622b1d740c80c653b8bf21893e
    contract_hash: a2e5b1d24ccce1ddce20486917550e0a94628486308ca7177373cf03cd40fcdf
    binding_hash: 0dc3a77c7aeeccfb151b5220c187aab390c27f9163bb2e6dd85d0280373c17b0
    fingerprint: 77f3be4e085990eca1d51015b7b57d7c44de10d8eac6c985aafc24e3ad520a3c
    fingerprint_components:
      contract: a2e5b1d24ccce1ddce20486917550e0a94628486308ca7177373cf03cd40fcdf
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
      - symbol_id: SYM-unit-test-cli-workspace-snapshot-dirtiness
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Creates a tracked repository containing source and Kibi recovery artifacts, then proves excluded operational changes remain fully diagnosed without dirtying the verification snapshot and relevant source changes do dirty it. Also proves receipt-only edits to a tracked proof document leave verification snapshot dirtiness false with an unchanged snapshot hash, while edits beyond receipt frontmatter do dirty it.