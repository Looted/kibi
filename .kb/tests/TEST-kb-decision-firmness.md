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
    receipt_id: PR-a01adc98bfbeb32b3591dd11
    test_id: TEST-kb-decision-firmness
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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
