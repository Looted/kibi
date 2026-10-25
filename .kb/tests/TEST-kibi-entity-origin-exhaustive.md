---
title: Every entity type accepts every origin kind
status: passing
tags:
  - proof
  - certificate
  - exhaustive
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-entity-origin-exhaustive
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-mutation-entity-types-schema
  proves:
    - CLAIM-7AC3394BD0DCD7A9
    - CLAIM-E77E686DE934A103
origin:
  kind: agent
  recorded_at: '2026-10-24T19:31:44.708Z'
id: TEST-kibi-entity-origin-exhaustive
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f2086aef905bf277affd287b
    test_id: TEST-kibi-entity-origin-exhaustive
    scope: unit
    outcome: passed
    code_snapshot: 88f72ac7863bc053137ae0fbd6e7ea179d4fbf9dd5cb363152f2b4fc11739754
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-25T18:53:59.319Z'
    finished_at: '2026-10-25T18:53:59.586Z'
    artifact_digest: 35b8b1a733dd95f5b26a5e75e43ffb6bb9f9c42a2dd1a74c152f2a8c0fe68262
    contract_hash: a824a4dc07b59cbef7d472e7fa4391ae25c56e8ea1be90a8b864fb7a81d6550b
    binding_hash: dedc71a7ea7c746af0998e29d9101f99df228996af7002d46dd95b6d7e2c2fb8
    fingerprint: bd20a63c371b25944e0b547bdcaf3be1ffad53b15da2dee0d98ed29f15007954
    fingerprint_components:
      contract: a824a4dc07b59cbef7d472e7fa4391ae25c56e8ea1be90a8b864fb7a81d6550b
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
      - symbol_id: SYM-test-entity-origin-exhaustive
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: exhaustive
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: exhaustive
      test_id: TEST-kibi-entity-origin-exhaustive
      domain:
        symbol_id: SYM-mutation-entity-types-schema
        members:
          - req
          - scenario
          - test
          - adr
          - flag
          - event
          - symbol
          - fact
      results:
        - member: req
          outcome: passed
        - member: scenario
          outcome: passed
        - member: test
          outcome: passed
        - member: adr
          outcome: passed
        - member: flag
          outcome: passed
        - member: event
          outcome: passed
        - member: symbol
          outcome: passed
        - member: fact
          outcome: passed
    certificate_digest: 353c328ee5f355e3c4ae2011fccfd8d70761392f01679464318e563d802a2c39
    claim_bindings:
      - claim_key: CLAIM-7AC3394BD0DCD7A9
        requirement_id: REQ-kibi-entity-origin
        fact_id: FACT-PRED-entity-origin-field
        binding: attested
        scope: code
      - claim_key: CLAIM-E77E686DE934A103
        requirement_id: REQ-kibi-entity-origin
        fact_id: FACT-PRED-entity-origin-rejects-unknown
        binding: attested
        scope: code
---
Checks every member of ENTITY_TYPES against the entity schema: the entity validates without an origin and with each origin kind and its optional ref, approved_by and recorded_at, and an unknown kind, an unknown field or a missing kind is rejected; the run leaves an exhaustive certificate over ENTITY_TYPES.