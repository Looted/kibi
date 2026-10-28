---
title: The engine daemon shall stop after 600000 milliseconds idle, by an arithmetic proof
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
    - symbol_id: SYM-proof-engine-idle-timeout
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-cli-engine-idle-timeout
  proves:
    - CLAIM-28EA5B8DC7DE84A7
origin:
  kind: agent
  recorded_at: '2026-10-28T19:04:07.259Z'
id: TEST-proof-engine-idle-timeout
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-2790bf26691c38de69896655
    test_id: TEST-proof-engine-idle-timeout
    scope: unit
    outcome: passed
    code_snapshot: 7369235697c19101619fe77461ac09a556c20ad537e16384e1c7831c5c99924f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T19:04:57.020Z'
    finished_at: '2026-10-28T19:04:57.136Z'
    artifact_digest: 20e7b9bbd5b14cafe57b5d58be4705bc8fa0fe8fa8502cbc7338f2f7f416d059
    contract_hash: 9f37298380941ec51e3ca25e61f3fd621abf710a6b0a1c498eb7005912ef0996
    binding_hash: 06bf1f5f1c05b9961dd9c2e814f2cc492fc2318a20e3d14ed6bb09c3174667dc
    fingerprint: 7be78d348899fe306d2562eeaab3cc1874e9c56ed9e15edc7d8349758a61a393
    fingerprint_components:
      contract: 9f37298380941ec51e3ca25e61f3fd621abf710a6b0a1c498eb7005912ef0996
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
      - symbol_id: SYM-proof-engine-idle-timeout
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
      test_id: TEST-proof-engine-idle-timeout
      variable: idle_timeout_ms
      value_type: int
      assumptions:
        - operator: eq
          value: 600000
      claim:
        operator: eq
        value: 600000
    certificate_digest: 6fc4363e1c6693dfa94d2275f7d6bb0c2ea6b8ecd87ec0d196bf647676d51a9b
    claim_bindings:
      - claim_key: CLAIM-28EA5B8DC7DE84A7
        requirement_id: REQ-engine-protocol-settings
        fact_id: FACT-engine-idle-timeout
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 600000
          value_type: int
          variable: idle_timeout_ms
---
Proves that the engine daemon shall stop after 600000 milliseconds idle, against the code Kibi reads at ingest.