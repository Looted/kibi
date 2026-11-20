---
title: The polarity value backfill code shall be polarity_value_backfill, by a regex proof
status: passing
tags:
  - proof
  - certificate
  - regex
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-polarity-backfill-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-migrate-polarity-backfill-code
  proves:
    - CLAIM-9D5492D92C96C6BA
origin:
  kind: agent
  recorded_at: '2026-10-28T18:51:06.683Z'
id: TEST-proof-polarity-backfill-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-0162ca42893ab8a9cda3c921
    test_id: TEST-proof-polarity-backfill-code
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 2b5986489b1940817f5ff92fbef32d89847aba35859ad0a904d0fe152ac0c262
    binding_hash: c87a8e774ce7199de319dcdb994ba3c4e2851543a3742bb60bad47a0e9bc91d8
    fingerprint: 8b69b1a5212c41feab0746e987e5196efbf984a9b948d3f8e1cde67cb3c80a51
    fingerprint_components:
      contract: 2b5986489b1940817f5ff92fbef32d89847aba35859ad0a904d0fe152ac0c262
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
      - symbol_id: SYM-proof-polarity-backfill-code
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: regex
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: regex
      test_id: TEST-proof-polarity-backfill-code
      pattern:
        symbol_id: SYM-migrate-polarity-backfill-code
        type: string
        value: polarity_value_backfill
    certificate_digest: 075b5c0067bd525e992e3edfee4f6f047e0de071cc5e27f22fb78ccb8c8b324c
    claim_bindings:
      - claim_key: CLAIM-9D5492D92C96C6BA
        requirement_id: REQ-cli-schema-migration-codes
        fact_id: FACT-polarity-backfill-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: polarity_value_backfill
---
Proves that the polarity value backfill code shall be polarity_value_backfill, against the code Kibi reads at ingest.