---
title: The entity body context check shall start at KB schema version 8, by an arithmetic proof
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
    - symbol_id: SYM-proof-body-context-schema-version
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-schema6-BODY_CONTEXT_SCHEMA_VERSION
  proves:
    - CLAIM-B32EB4E2784C2804
origin:
  kind: agent
  recorded_at: '2026-10-28T11:05:38.879Z'
id: TEST-proof-body-context-schema-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-3a44596ab15d01fa45ce0da7
    test_id: TEST-proof-body-context-schema-version
    scope: unit
    outcome: passed
    code_snapshot: 4f161374550f014eb48d8e921619cbdaa1e1e274ac4673138b0e5ff3cbb2b55f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T11:06:15.779Z'
    finished_at: '2026-10-28T11:06:15.934Z'
    artifact_digest: e16f492df9138c4b3b7e3fc8c1c4712e249740fd2c3e56f4ade4303b66689db4
    contract_hash: c0398ccb7eba70f06b85d6c2c2d001af2b6160c8afd85655d205d20208b69588
    binding_hash: ce6cb38f52e1e3bafe54019a0d80e896715a3939d735802d4e4971a5523ecead
    fingerprint: a8add7d4b56c17361118d49795be9d2574e72be9891a0b4857dcbcbf91c50688
    fingerprint_components:
      contract: c0398ccb7eba70f06b85d6c2c2d001af2b6160c8afd85655d205d20208b69588
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
      - symbol_id: SYM-proof-body-context-schema-version
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
      test_id: TEST-proof-body-context-schema-version
      variable: context_schema_version
      value_type: int
      assumptions:
        - operator: eq
          value: 8
      claim:
        operator: eq
        value: 8
    certificate_digest: 3933a223289d8ea40b9c91208dccb593467bcfb27bee7f00e697c3fbe54908be
    claim_bindings:
      - claim_key: CLAIM-B32EB4E2784C2804
        requirement_id: REQ-kb-entity-context-rule-ids
        fact_id: FACT-body-context-schema-version
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 8
          value_type: int
          variable: context_schema_version
---
Proves that the entity body context check shall start at KB schema version 8, against the code Kibi reads at ingest.