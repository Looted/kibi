---
title: A query shall return at most 32000 characters of an entity body, by an arithmetic proof
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
    - symbol_id: SYM-proof-query-body-max-chars
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-discovery-query-body-max-chars
  proves:
    - CLAIM-15878CC317A04D96
origin:
  kind: agent
  recorded_at: '2026-10-28T17:23:32.854Z'
id: TEST-proof-query-body-max-chars
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7229ad86150539b6acbeaf94
    test_id: TEST-proof-query-body-max-chars
    scope: unit
    outcome: passed
    code_snapshot: 6f361d2b7a0ce4be8a55a8981006015e29d04d73175b724e90cd4a7d0f2b289f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:24:55.572Z'
    finished_at: '2026-10-28T17:24:55.805Z'
    artifact_digest: 60ceeb627ceda39ee1aa40403bdbf4064fb4af441a70f3dc791d0cacd5b59802
    contract_hash: 39ddf0172e5cc823e6f80d8014f650afb6bc741bdfd008b6f914eb1c70f6d6c7
    binding_hash: 03a882a7d3ed78edb17a1c4b3c86ea92ce3f7f918d7ae4cd2e29414e8791d5f3
    fingerprint: 3d8e6e8b0f18e2f91008db0b51389d5d907735f2a88d6ab5eb4c4009350fd2d5
    fingerprint_components:
      contract: 39ddf0172e5cc823e6f80d8014f650afb6bc741bdfd008b6f914eb1c70f6d6c7
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
      - symbol_id: SYM-proof-query-body-max-chars
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
      test_id: TEST-proof-query-body-max-chars
      variable: body_max_chars
      value_type: int
      assumptions:
        - operator: eq
          value: 32000
      claim:
        operator: eq
        value: 32000
    certificate_digest: e91ee5bbd9d6dc40f925e6cc18f086bab156849745186c6123d0ce4b46ce6e2e
    claim_bindings:
      - claim_key: CLAIM-15878CC317A04D96
        requirement_id: REQ-kibi-operation-page-sizes
        fact_id: FACT-query-body-max-chars
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 32000
          value_type: int
          variable: body_max_chars
---
Proves that a query shall return at most 32000 characters of an entity body, against the code Kibi reads at ingest.