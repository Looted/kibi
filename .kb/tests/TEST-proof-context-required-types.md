---
title: The entity types that must carry body context shall be req, scenario, test, adr and fact, by an exhaustive proof
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
    - symbol_id: SYM-proof-context-required-types
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-entity-body-context-required-types
  proves:
    - CLAIM-F79D10EECC5C5800
origin:
  kind: agent
  recorded_at: '2026-10-28T10:38:21.528Z'
id: TEST-proof-context-required-types
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-bb30bc2a6b8220368fbdbdb0
    test_id: TEST-proof-context-required-types
    scope: unit
    outcome: passed
    code_snapshot: 6311ff0237c9e52f3017d02926ea2520a1fa6dd28832ee4b7f1ae41a5ca1cb23
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T10:39:58.613Z'
    finished_at: '2026-10-28T10:39:58.726Z'
    artifact_digest: 96953a24fa6483e0968ca116e3143babd53bdbe410ccc6c3decc1a045a9925bb
    contract_hash: 9be7abcdfb7d923764b761f5d542ee2d8ae2db144bf412448b3edfd70dc04e34
    binding_hash: 7b9f22b38bc3f5bd5f5b83e4029679b3224db8eb53c7ca59ed453215623cc4b8
    fingerprint: c892b962503daa779739f91b6670a0d9d5e8bbe5659ff0db0a24b82a83a9f961
    fingerprint_components:
      contract: 9be7abcdfb7d923764b761f5d542ee2d8ae2db144bf412448b3edfd70dc04e34
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
      - symbol_id: SYM-proof-context-required-types
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
      test_id: TEST-proof-context-required-types
      domain:
        symbol_id: SYM-entity-body-context-required-types
        members:
          - req
          - scenario
          - test
          - adr
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
        - member: fact
          outcome: passed
    certificate_digest: 7783f4f9762e722b79bf5ef52fd165c0d202e5ab5919a63da2206c92975675e1
    claim_bindings:
      - claim_key: CLAIM-F79D10EECC5C5800
        requirement_id: REQ-kb-entity-body-context-settings
        fact_id: FACT-context-required-types
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - adr
            - fact
            - req
            - scenario
            - test
---
Proves that the entity types that must carry body context shall be req, scenario, test, adr and fact, against the code Kibi reads at ingest.