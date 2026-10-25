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
origin:
  kind: agent
  recorded_at: '2026-10-24T19:31:44.708Z'
id: TEST-kibi-entity-origin-exhaustive
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-64bac23f9746c89edbd81753
    test_id: TEST-kibi-entity-origin-exhaustive
    scope: unit
    outcome: passed
    code_snapshot: ded72dac6be0ba6834ef5c3166558b3ffad93197ba8871d340c23f98ebdbb69e
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-24T21:36:43.211Z'
    finished_at: '2026-10-24T21:36:43.411Z'
    artifact_digest: d364f7c142979d4531980824f49fef9ca727293b91db5741335a12582f1dd2da
    contract_hash: e98230f403ddf598529558c330f6a80ad919dbf468d0313df723de7538d878e8
    binding_hash: 99615deb31ce4c8bcf1e8c85c0220263e49586deeea272018f8ab774036418e3
    fingerprint: cd071ddfd88a1c244261518a4348e410772e61bd47aba531d6fe1ee46bd2af2c
    fingerprint_components:
      contract: e98230f403ddf598529558c330f6a80ad919dbf468d0313df723de7538d878e8
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
---
Checks every member of ENTITY_TYPES against the entity schema: the entity validates without an origin and with each origin kind and its optional ref, approved_by and recorded_at, and an unknown kind, an unknown field or a missing kind is rejected; the run leaves an exhaustive certificate over ENTITY_TYPES.