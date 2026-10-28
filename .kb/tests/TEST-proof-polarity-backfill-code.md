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
    receipt_id: PR-a36434cdd281ff19920081f7
    test_id: TEST-proof-polarity-backfill-code
    scope: unit
    outcome: passed
    code_snapshot: dc0be4d5803f22ca38ce1004b6769d2368029ae49edea82620e6c6618cbf4d3a
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T18:53:12.554Z'
    finished_at: '2026-10-28T18:53:12.718Z'
    artifact_digest: e7057b10169c5da276dbf85ba7c452a38860ca847f97c5adba90ae688164b94c
    contract_hash: 2b5986489b1940817f5ff92fbef32d89847aba35859ad0a904d0fe152ac0c262
    binding_hash: 4e6940e26da1b587e422062ad8394310a99f82869d566fc2ad01746bc87d3f45
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