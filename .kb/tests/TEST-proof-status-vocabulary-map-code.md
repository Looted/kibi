---
title: The requirement status vocabulary map code shall be req_status_vocabulary_map, by a regex proof
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
    - symbol_id: SYM-proof-status-vocabulary-map-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-schema6-REQ_STATUS_VOCABULARY_MAP_CODE
  proves:
    - CLAIM-A0D1F4B5D1074C78
origin:
  kind: agent
  recorded_at: '2026-10-28T18:50:07.515Z'
id: TEST-proof-status-vocabulary-map-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-339ea5d9040beefa8a0817e7
    test_id: TEST-proof-status-vocabulary-map-code
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 76018c6059079f5bbad1d6bd83a7a708daa0b7efe430d3606578bafbe4d95a4c
    binding_hash: f7ac11e198f21d84824b180de2a8ba167a011c476eb10774238911cbdff91d0e
    fingerprint: 3b09cf65f91d5e1d3eb29cbfa6c26152613ca568d31e3cb476abb655c8efad46
    fingerprint_components:
      contract: 76018c6059079f5bbad1d6bd83a7a708daa0b7efe430d3606578bafbe4d95a4c
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
      - symbol_id: SYM-proof-status-vocabulary-map-code
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
      test_id: TEST-proof-status-vocabulary-map-code
      pattern:
        symbol_id: SYM-schema6-REQ_STATUS_VOCABULARY_MAP_CODE
        type: string
        value: req_status_vocabulary_map
    certificate_digest: a04701fc3bd3ecc66e461acf7dd0aa306d6b21765d8de7dc6214166b5ac51184
    claim_bindings:
      - claim_key: CLAIM-A0D1F4B5D1074C78
        requirement_id: REQ-cli-schema-migration-codes
        fact_id: FACT-status-vocabulary-map-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: req_status_vocabulary_map
---
Proves that the requirement status vocabulary map code shall be req_status_vocabulary_map, against the code Kibi reads at ingest.