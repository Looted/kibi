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
    receipt_id: PR-e7267e6ddb6f34d8bc793018
    test_id: TEST-proof-status-vocabulary-map-code
    scope: unit
    outcome: passed
    code_snapshot: dc0be4d5803f22ca38ce1004b6769d2368029ae49edea82620e6c6618cbf4d3a
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T18:52:54.841Z'
    finished_at: '2026-10-28T18:52:55.030Z'
    artifact_digest: 6ecb1efbabf0ac407bcfbc7076c623562a168c97e2329829a9678aa182966601
    contract_hash: 76018c6059079f5bbad1d6bd83a7a708daa0b7efe430d3606578bafbe4d95a4c
    binding_hash: e1c96fc51845f1a89fa9916e55b2435cc7207dc97203dccb9c25861e1fea3985
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