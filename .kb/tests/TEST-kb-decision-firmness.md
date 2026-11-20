---
title: Decision firmness checks, migration, upsert guard and display tests
status: passing
priority: must
tags:
  - kb
  - decisions
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kb-decision-firmness
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-12T22:24:34.076Z'
id: TEST-kb-decision-firmness
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-81ecff2c6e914144bb1c817f
    test_id: TEST-kb-decision-firmness
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: eb159839a2ab422217e9c043e74c5be557bea0a9f30e77c254e6ba081fbff360
    binding_hash: cc112000e3522e4b03e6ca252895d4453b8a73fb37c61ef811ebb6999eee6a5f
    fingerprint: ba6caeb3f8448b0636e6325ccd0c491fbbfe1ccc4b3302da47c66464bdb4b823
    fingerprint_components:
      contract: eb159839a2ab422217e9c043e74c5be557bea0a9f30e77c254e6ba081fbff360
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
      - symbol_id: SYM-test-kb-decision-firmness
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the decision firmness suite: the firmness helpers, each blocking rule over a workspace with front-matter links and relationship shards, the manifest acknowledgement, the schema 9 migration fragment and its apply, extractor validation, the kb_upsert refusal of an unreferenced firm decision, the effective firmness in search answer rows and the hook snippet suffix.

## Context
Proves the requirement end to end through the public check, migration and upsert paths instead of the helpers alone, so a regression in wiring (rule registry, check executor, migration step) fails the proof.
