---
title: A non-governing search status shall be superseded, deprecated, rejected, retired, obsolete or archived, by an exhaustive proof
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
    - symbol_id: SYM-proof-search-non-governing-statuses
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  proves:
    - CLAIM-14A8A63056DB3141
  domain_source:
    symbol_id: SYM-const-search-non-governing-statuses
origin:
  kind: agent
  recorded_at: '2026-10-30T19:42:18.835Z'
id: TEST-proof-search-non-governing-statuses
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-264dd210e4d472295030e9a9
    test_id: TEST-proof-search-non-governing-statuses
    scope: unit
    outcome: passed
    code_snapshot: e2663d10a2e1a0b8fdd0d38e888ee46d8031436be2244a613e1c406fbfa714b0
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-30T19:45:36.291Z'
    finished_at: '2026-10-30T19:45:36.464Z'
    artifact_digest: ec7dd5ba485835949c3ba5ec2878ef6d7fddf778f4523b349017d01b3e0d4e6e
    contract_hash: ba03e7e74ec1a2c980429cb8acf7c10fc00f35192c54b5764bbfccea0fc81030
    binding_hash: 3309db3a061b1dab0534beca18a4f212dca3092a8598d6d50a85191aa95ee8a8
    fingerprint: a9f60fcdef66d987a744abc8e14b76648b602e977f92245876be3d449df41d0f
    fingerprint_components:
      contract: ba03e7e74ec1a2c980429cb8acf7c10fc00f35192c54b5764bbfccea0fc81030
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
      - symbol_id: SYM-proof-search-non-governing-statuses
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
      test_id: TEST-proof-search-non-governing-statuses
      domain:
        symbol_id: SYM-const-search-non-governing-statuses
        members:
          - superseded
          - deprecated
          - rejected
          - retired
          - obsolete
          - archived
      results:
        - member: superseded
          outcome: passed
        - member: deprecated
          outcome: passed
        - member: rejected
          outcome: passed
        - member: retired
          outcome: passed
        - member: obsolete
          outcome: passed
        - member: archived
          outcome: passed
    certificate_digest: 03eb22ac6b6022d821382d6ffabb1844c694e9b4e7bbafa7b28369a10c83c724
    claim_bindings:
      - claim_key: CLAIM-14A8A63056DB3141
        requirement_id: REQ-search-non-governing-statuses
        fact_id: FACT-search-non-governing-statuses
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - archived
            - deprecated
            - obsolete
            - rejected
            - retired
            - superseded
---
Proves that a non-governing search status shall be superseded, deprecated, rejected, retired, obsolete or archived, against the code Kibi reads at ingest.