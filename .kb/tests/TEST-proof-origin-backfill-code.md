---
title: The entity origin backfill code shall be entity_origin_backfill, by a regex proof
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
    - symbol_id: SYM-proof-origin-backfill-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-migration-entity-origin-backfill-code
  proves:
    - CLAIM-D2986008FAD25622
origin:
  kind: agent
  recorded_at: '2026-10-28T18:49:47.253Z'
id: TEST-proof-origin-backfill-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-ada67fa423f51b5fabd47332
    test_id: TEST-proof-origin-backfill-code
    scope: unit
    outcome: passed
    code_snapshot: dc0be4d5803f22ca38ce1004b6769d2368029ae49edea82620e6c6618cbf4d3a
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T18:52:48.859Z'
    finished_at: '2026-10-28T18:52:49.026Z'
    artifact_digest: db0cd96d3c600f0ffcf7e1f64f4407d805aab27c1a3332921328e274bfb849e1
    contract_hash: 03d6f78db3c677ad014b55724735fa42262896d4d0866dabb749c2d19021fc85
    binding_hash: 646ddb3c3916263fa1b54f62b30e5c90cccf09462b31ef0935158f5ab830c66e
    fingerprint: acf056f1394f11fa84bbb6377f132bc44ec3c7c79b6912f5d81054836efc1658
    fingerprint_components:
      contract: 03d6f78db3c677ad014b55724735fa42262896d4d0866dabb749c2d19021fc85
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
      - symbol_id: SYM-proof-origin-backfill-code
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
      test_id: TEST-proof-origin-backfill-code
      pattern:
        symbol_id: SYM-migration-entity-origin-backfill-code
        type: string
        value: entity_origin_backfill
    certificate_digest: 298c777b174304467ad0dc3f176d334d079d8f92e862fc85bbc3e6896f6ebf13
    claim_bindings:
      - claim_key: CLAIM-D2986008FAD25622
        requirement_id: REQ-cli-schema-migration-codes
        fact_id: FACT-origin-backfill-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: entity_origin_backfill
---
Proves that the entity origin backfill code shall be entity_origin_backfill, against the code Kibi reads at ingest.