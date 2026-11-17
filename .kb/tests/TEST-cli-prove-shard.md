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
    receipt_id: PR-b32822f01c35dfd34a245b67
    test_id: TEST-cli-prove-shard
    scope: end_to_end
    outcome: passed
    code_snapshot: 04a00cd924e941d4cd375895455395bae29e3402014df1a33cc020137430759d
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T11:22:47.002Z'
    finished_at: '2026-11-17T11:22:47.284Z'
    artifact_digest: 492eec00af001c2daf124877c3db8ce5266d9f1d06c213676eac635449b49e1e
    contract_hash: b26cf40ca0ea595b83e149bec6db224bb5ce874437fd1465dd06ad214ca2b84b
    binding_hash: 72298659f6a44eae74d4f0177d8669c43be8e80dcca79bcc7052bc552b777bbc
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