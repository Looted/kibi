---
title: Decision firmness shall start at KB schema version 9, by an arithmetic proof
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
    - symbol_id: SYM-proof-decision-firmness-schema-version
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-schema6-DECISION_FIRMNESS_SCHEMA_VERSION
  proves:
    - CLAIM-0061976CDD089FC0
origin:
  kind: agent
  recorded_at: '2026-10-28T11:03:31.982Z'
id: TEST-proof-decision-firmness-schema-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-76e84f346f44d1aa92bf4a9e
    test_id: TEST-proof-decision-firmness-schema-version
    scope: unit
    outcome: passed
    code_snapshot: 8f943f21fb235bc55121047965e970d19b2358702a2524537fc13cc25d316246
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T11:04:23.914Z'
    finished_at: '2026-10-28T11:04:24.099Z'
    artifact_digest: f206d78d841f27b3dabad52fc9b16ee24aa74b72f36f275b6dc9668fde5920f5
    contract_hash: b693d0c9fbcc845875326667132b38354115edcb6a7d44a14bc81574b8e91b66
    binding_hash: 727dc8474d38d0115f361edb939762c71f692172bfbcb0361c1daf34dd83574d
    fingerprint: f2dc61532013b02e2344a8a0dcada34d2bf8a133e5d391555c9178a1cc8c1acc
    fingerprint_components:
      contract: b693d0c9fbcc845875326667132b38354115edcb6a7d44a14bc81574b8e91b66
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
      - symbol_id: SYM-proof-decision-firmness-schema-version
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
      test_id: TEST-proof-decision-firmness-schema-version
      variable: firmness_schema_version
      value_type: int
      assumptions:
        - operator: eq
          value: 9
      claim:
        operator: eq
        value: 9
    certificate_digest: 793c15e5524ebeab71cbfdef51eabc54e510dc599c1c39c52c655f93d2084bae
    claim_bindings:
      - claim_key: CLAIM-0061976CDD089FC0
        requirement_id: REQ-kb-decision-firmness-rule-ids
        fact_id: FACT-decision-firmness-schema-version
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 9
          value_type: int
          variable: firmness_schema_version
---
Proves that decision firmness shall start at KB schema version 9, against the code Kibi reads at ingest.