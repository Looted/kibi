---
title: Bootstrap offers search hints from 50 requirement documents, by an arithmetic proof
status: passing
tags:
  - proof
  - certificate
  - arithmetic
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-search-hints-offer-requirements
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-search-hints-offer-requirements
  proves:
    - CLAIM-7DEE8C099960FB94
origin:
  kind: agent
  recorded_at: '2026-10-29T21:28:58.691Z'
id: TEST-proof-search-hints-offer-requirements
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a5bd98d6825f47567f7211db
    test_id: TEST-proof-search-hints-offer-requirements
    scope: unit
    outcome: passed
    code_snapshot: a9399303a725390d9739924e3b39a6c3beabaec8016c2355e68d324ce6cce561
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T21:35:43.687Z'
    finished_at: '2026-10-29T21:35:43.823Z'
    artifact_digest: 0e8b4f852a62c7c6b25f595eb000bc241fbbb81f2bf1f6fe28ecc2f3f512b212
    contract_hash: f4eeb6dc1fe16903d34f312e06f1432e22707d2bbf2287cecb53b7a62fce8f42
    binding_hash: 9b1ba81ea7ffb32c6c72aae4744a4c2d0d25b743b9babda883d127431af09300
    fingerprint: 170b64cf629da04e086670adbe9ace722b2d2b9dd7fab0a59e604b097722837d
    fingerprint_components:
      contract: f4eeb6dc1fe16903d34f312e06f1432e22707d2bbf2287cecb53b7a62fce8f42
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
      - symbol_id: SYM-proof-search-hints-offer-requirements
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: arithmetic
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: arithmetic
      test_id: TEST-proof-search-hints-offer-requirements
      variable: offer_min_requirements
      value_type: int
      assumptions:
        - operator: eq
          value: 50
      claim:
        operator: eq
        value: 50
    certificate_digest: 016746a450d9b0adcae540965f82b29114f7a097fd50735db7a5a053ea9a74e2
    claim_bindings:
      - claim_key: CLAIM-7DEE8C099960FB94
        requirement_id: REQ-kibi-search-hints-limits
        fact_id: FACT-search-hints-offer-limit
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 50
          value_type: int
          variable: offer_min_requirements
---
Reads SEARCH_HINTS_OFFER_REQUIREMENTS and proves the bootstrap plan offers search hints from 50 requirement documents.