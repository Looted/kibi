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
    receipt_id: PR-6d2f14a12c49205617c3346e
    test_id: TEST-cli-migrate-entity-type-backfill-exhaustive
    scope: unit
    outcome: passed
    code_snapshot: ded72dac6be0ba6834ef5c3166558b3ffad93197ba8871d340c23f98ebdbb69e
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-24T21:36:25.786Z'
    finished_at: '2026-10-24T21:36:26.529Z'
    artifact_digest: 07e80c495a89a6a719354d643c43d93afa09529290ac60c1790998645d49d1a9
    contract_hash: 9f7b17fa89c69e43e6520a3983563da13d13b4dba3e7eecb4d4468157be6155c
    binding_hash: cf962c85951cd24604759b843bf17d96bb0ad2a080a61fbb55e326bc477928a7
    fingerprint: f51254e6f0a694f289f9109fe1ef5bf7abc634e263b2c43e6af015aa8677b450
    fingerprint_components:
      contract: 9f7b17fa89c69e43e6520a3983563da13d13b4dba3e7eecb4d4468157be6155c
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
---
Checks every member of ENTITY_LANES at every KB schema version from 1 to 11 with plain, nested and CRLF documents: the type backfill plans and writes exactly the folder-implied type line, changes no other line and plans nothing on a second run; the run leaves an exhaustive certificate over ENTITY_LANES.