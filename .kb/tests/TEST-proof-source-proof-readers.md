---
title: A source proof reader shall be json, yaml, glob, openapi, references, schema, routes, validator or prolog, by an exhaustive proof
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
    - symbol_id: SYM-proof-source-proof-readers
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-const-source-readers
  proves:
    - CLAIM-2337B1E3178A6C90
origin:
  kind: agent
  recorded_at: '2026-10-29T16:46:17.071Z'
id: TEST-proof-source-proof-readers
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-334d689559411f4f8d94336c
    test_id: TEST-proof-source-proof-readers
    scope: unit
    outcome: passed
    code_snapshot: 3ef679be4889b29bbf2035f91775c6f274ff1378dfca354d2d0e2fee8d047f47
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T16:50:23.740Z'
    finished_at: '2026-10-29T16:50:23.900Z'
    artifact_digest: abafc7f1cded2e07c56c1b0f3f141313787cc4e7dbd23681c68fbdff9cc46f0e
    contract_hash: 11d58651b6bd0c3164ff7dbe2f3384683aa14ac1fdbe6d76cce0b7aaea49b58f
    binding_hash: fc4c05e93b880af215c026259a30635c9c31a1c27d560217d8ec659b246e03d0
    fingerprint: 206f0b4718385b34ffa2b379da57e37267ab4cb844bc6a16db342ef3735cd0db
    fingerprint_components:
      contract: 11d58651b6bd0c3164ff7dbe2f3384683aa14ac1fdbe6d76cce0b7aaea49b58f
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
      - symbol_id: SYM-proof-source-proof-readers
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
      test_id: TEST-proof-source-proof-readers
      domain:
        symbol_id: SYM-const-source-readers
        members:
          - json
          - yaml
          - glob
          - openapi
          - references
          - schema
          - routes
          - validator
      results:
        - member: json
          outcome: passed
        - member: yaml
          outcome: passed
        - member: glob
          outcome: passed
        - member: openapi
          outcome: passed
        - member: references
          outcome: passed
        - member: schema
          outcome: passed
        - member: routes
          outcome: passed
        - member: validator
          outcome: passed
    certificate_digest: 2b154c6c70b76075a07c85b75364969b2aa8a46fae80762915d49e1984e2940c
    claim_bindings:
      - claim_key: CLAIM-FF4438926644A069
        requirement_id: REQ-kibi-proof-vocabulary
        fact_id: FACT-source-proof-readers
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - glob
            - json
            - openapi
            - references
            - routes
            - schema
            - validator
            - yaml
---
Proves that a source proof reader shall be json, yaml, glob, openapi, references, schema, routes or validator, against the code Kibi reads at ingest.