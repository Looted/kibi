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
    receipt_id: PR-d20fbb7dbedd402d869a0a04
    test_id: TEST-kibi-entity-origin-exhaustive
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: a824a4dc07b59cbef7d472e7fa4391ae25c56e8ea1be90a8b864fb7a81d6550b
    binding_hash: 35f858dd78540781033c9970d33b87f83c27482fbc13d4e4e3ac1089ce50aa49
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