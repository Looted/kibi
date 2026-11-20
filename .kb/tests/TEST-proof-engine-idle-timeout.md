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
    receipt_id: PR-ad93eead79c1a0a29130b1ed
    test_id: TEST-proof-engine-idle-timeout
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 9f37298380941ec51e3ca25e61f3fd621abf710a6b0a1c498eb7005912ef0996
    binding_hash: 8b7fbbf6199dd1df750587f0cd162f528be29f9de8a3443bf3d21e318c7e1f5c
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