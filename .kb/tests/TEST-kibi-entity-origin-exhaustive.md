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
    receipt_id: PR-52700285543f1ad2f06d0c4a
    test_id: TEST-kibi-entity-origin-exhaustive
    scope: unit
    outcome: passed
    code_snapshot: f28722f7660a882a57ee32674c16399e57f709d942764918804ea85d33167119
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-30T12:51:54.035Z'
    finished_at: '2026-10-30T12:51:54.468Z'
    artifact_digest: 0143105c26a9303cd116b37b0c9e3ed0cc4aacc2f362fc374d7af833b19243d1
    contract_hash: a824a4dc07b59cbef7d472e7fa4391ae25c56e8ea1be90a8b864fb7a81d6550b
    binding_hash: cbaa8c1318e03dfcf8f19ffc5655249a5ba9dd4d62680b81e5a3e815e80c15c4
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
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - adr
            - event
            - fact
            - flag
            - req
            - scenario
            - symbol
            - test
      - claim_key: CLAIM-E77E686DE934A103
        requirement_id: REQ-kibi-entity-origin
        fact_id: FACT-PRED-entity-origin-rejects-unknown
        binding: attested
        scope: code
---
Checks every member of ENTITY_TYPES against the entity schema: the entity validates without an origin and with each origin kind and its optional ref, approved_by and recorded_at, and an unknown kind, an unknown field or a missing kind is rejected; the run leaves an exhaustive certificate over ENTITY_TYPES.