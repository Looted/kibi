---
title: Decision firmness checks, migration, upsert guard and display tests
status: active
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-26d9d97341a60a818bc3a5a8
    test_id: TEST-kb-decision-firmness
    scope: end_to_end
    outcome: passed
    code_snapshot: e835513455c222ab54e344a32239b0bae6e8a3931cbe76976fdb7f54201fa22f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-12T23:06:43.090Z'
    finished_at: '2026-10-12T23:06:51.190Z'
    artifact_digest: 371eafe9d6d4fd578fef1f51744fa060113bfc25ae34e5b09a44cbcdd06b3dab
    contract_hash: eb159839a2ab422217e9c043e74c5be557bea0a9f30e77c254e6ba081fbff360
    binding_hash: 3f7b5b1d55a0a794a1bcac9e4fd7fdafa46826dd3be738c052af563ab0263b80
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
---
Runs the decision firmness suite: the firmness helpers, each blocking rule over a workspace with front-matter links and relationship shards, the manifest acknowledgement, the schema 9 migration fragment and its apply, extractor validation, the kb_upsert refusal of an unreferenced firm decision, the effective firmness in search answer rows and the hook snippet suffix.

## Context
Proves the requirement end to end through the public check, migration and upsert paths instead of the helpers alone, so a regression in wiring (rule registry, check executor, migration step) fails the proof.
