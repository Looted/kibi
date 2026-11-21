---
title: Every entity lane gets its folder-implied type
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
    - symbol_id: SYM-test-entity-type-backfill-exhaustive
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-canonical-ENTITY_LANES
  proves:
    - CLAIM-7D2B678A106147C3
origin:
  kind: agent
  recorded_at: '2026-10-24T19:31:43.084Z'
id: TEST-cli-migrate-entity-type-backfill-exhaustive
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-4c0b145f267b1b6017ba65f2
    test_id: TEST-cli-migrate-entity-type-backfill-exhaustive
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: a49abf31711051d577254ec03a86ae30e36a54fc804d104997fd1aa3d1702c50
    binding_hash: 6ab713fbf016039d3a9b6e019228e3da2d6d53024d3772082d20c2712790225a
    fingerprint: 57476c6d8487d92e9016eb4b8d825bba1cd4efb3bf240f9211893a3755019708
    fingerprint_components:
      contract: a49abf31711051d577254ec03a86ae30e36a54fc804d104997fd1aa3d1702c50
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
      - symbol_id: SYM-test-entity-type-backfill-exhaustive
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
      test_id: TEST-cli-migrate-entity-type-backfill-exhaustive
      domain:
        symbol_id: SYM-canonical-ENTITY_LANES
        members:
          - requirements
          - scenarios
          - tests
          - facts
          - adr
          - flags
          - events
      results:
        - member: requirements
          outcome: passed
        - member: scenarios
          outcome: passed
        - member: tests
          outcome: passed
        - member: facts
          outcome: passed
        - member: adr
          outcome: passed
        - member: flags
          outcome: passed
        - member: events
          outcome: passed
    certificate_digest: cb6067df08c3562243178dee72b38ad433808308a869f4285b3d477022660052
    claim_bindings:
      - claim_key: CLAIM-7D2B678A106147C3
        requirement_id: REQ-cli-migrate-entity-type-backfill
        fact_id: FACT-cli-migrate-entity-type-backfill-adds-type
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - adr
            - events
            - facts
            - flags
            - requirements
            - scenarios
            - tests
---
Checks every member of ENTITY_LANES at every KB schema version from 1 to 11 with plain, nested and CRLF documents: the type backfill plans and writes exactly the folder-implied type line, changes no other line and plans nothing on a second run; the run leaves an exhaustive certificate over ENTITY_LANES.