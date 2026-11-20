---
title: kibi prove --shard deals the selection into disjoint parts and --list prints it
status: passing
priority: should
tags:
  - ci
  - proof
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-cli-prove-shard
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-17T11:21:28.965Z'
id: TEST-cli-prove-shard
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-6d580942d5a0a8601309219b
    test_id: TEST-cli-prove-shard
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: b26cf40ca0ea595b83e149bec6db224bb5ce874437fd1465dd06ad214ca2b84b
    binding_hash: ed3fe99c96d31869e836e1f4d490e836e5af20e63217c479c4506e190b574c3b
    fingerprint: 15810adbd815c5d4418d144eb66bbcd9a4a111ba9f23e1ccefd4b651aa988d89
    fingerprint_components:
      contract: b26cf40ca0ea595b83e149bec6db224bb5ce874437fd1465dd06ad214ca2b84b
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
      - symbol_id: SYM-test-cli-prove-shard
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Parses K/N and refuses other values, checks for every part count from 1 to 9 that the parts are disjoint, hold every selected test and differ in size by at most one, maps --shard and --list through the CLI, and runs kibi prove --list with and without a shard without executing or ingesting anything.