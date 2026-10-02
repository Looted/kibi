---
title: KB merge workflow builds the driver from develop and proof-checks merges
status: passing
priority: should
tags:
  - ci
  - merge
  - proof
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-ci-kb-merge-resolution
      target: default
  success_policy: all_required_first_attempt
id: TEST-ci-kb-merge-resolution
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-09b33f4fe38d0777490e735f
    test_id: TEST-ci-kb-merge-resolution
    scope: end_to_end
    outcome: passed
    code_snapshot: de709e005f41a43e5af88c42e1e086bcf213d94589941ecfa921c2ae8c4ae1a3
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-10-02T08:26:12.965Z'
    finished_at: '2026-10-02T08:26:13.385Z'
    artifact_digest: a508754a949424935a7a5df2595b61ddbd4d8d8fbe2cf1885d8a4f0251a091d4
    contract_hash: 6addbec708ffb861003356ad86179609bf99ef386d16bdc17920fd4a15539d9d
    binding_hash: ce5c557f19417d14797082e5aa0ff44a12f49ba16e024f8690ba5b5d678a7903
    fingerprint: e04550c4ea47e4a3e0bc640a0575996e466e5eb6f3c9bd39d7d7de23e7b7144f
    fingerprint_components:
      contract: 6addbec708ffb861003356ad86179609bf99ef386d16bdc17920fd4a15539d9d
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
      - symbol_id: SYM-test-ci-kb-merge-resolution
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
