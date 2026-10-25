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
    receipt_id: PR-928f28a42b270bd1593bc306
    test_id: TEST-cli-migrate-entity-type-backfill-exhaustive
    scope: unit
    outcome: passed
    code_snapshot: 88f72ac7863bc053137ae0fbd6e7ea179d4fbf9dd5cb363152f2b4fc11739754
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-25T18:53:53.939Z'
    finished_at: '2026-10-25T18:53:54.287Z'
    artifact_digest: 84d8fab4dfd8526216d207b913e1a1cd0a60d69a0630ecfbdcdc914af94d4021
    contract_hash: a49abf31711051d577254ec03a86ae30e36a54fc804d104997fd1aa3d1702c50
    binding_hash: 98e0544185d1c986a585ca5f24cfa28bd2946b20cc1b10e742d53bfdfb0ff67b
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
        binding: attested
        scope: code
---
Checks every member of ENTITY_LANES at every KB schema version from 1 to 11 with plain, nested and CRLF documents: the type backfill plans and writes exactly the folder-implied type line, changes no other line and plans nothing on a second run; the run leaves an exhaustive certificate over ENTITY_LANES.