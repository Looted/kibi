---
title: Packed CLI GitHub report workflow and badge E2E
status: active
tags:
  - cli
  - github
  - report
  - badge
  - init
  - e2e
  - review:context-missing
text_ref: documentation/tests/e2e/packed/github-report-integration.test.ts
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-cli-github-report
      target: default
  success_policy: all_required_first_attempt
id: TEST-kibi-github-report-e2e
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a66296dca6dd62d652eb5f7a
    test_id: TEST-kibi-github-report-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: 7f5f3cbf07bcd668a6ba1d822ce431959e51a6f2bdc18ca3aef8600b71016261
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T10:21:24.228Z'
    finished_at: '2026-10-29T10:23:30.942Z'
    artifact_digest: 39e325d9fb6b3b5632e973fe9d2c2af418ac06942653adc7f10054d6307f70c4
    contract_hash: 5f1b42a89bcb45b30c59c92c47b8019ae77f53f9c5128053445da268175f8b04
    binding_hash: cd248e985910f53e4177720fca2f3bfe57de0c5a9addae5b670a0232fad8e8ff
    fingerprint: 0532b868224ad936788ecc0879a256c324132a85970ae587b842d9f5ea258716
    fingerprint_components:
      contract: 5f1b42a89bcb45b30c59c92c47b8019ae77f53f9c5128053445da268175f8b04
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
      - symbol_id: SYM-e2e-packed-cli-github-report
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