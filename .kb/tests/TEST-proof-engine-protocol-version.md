---
title: The engine protocol version shall be 1, by an arithmetic proof
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
    - symbol_id: SYM-proof-engine-protocol-version
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-cli-engine-protocol-version
  proves:
    - CLAIM-C5EC0AC1175F7801
origin:
  kind: agent
  recorded_at: '2026-10-28T19:03:48.355Z'
id: TEST-proof-engine-protocol-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b8be908935e1a477914da2c9
    test_id: TEST-proof-engine-protocol-version
    scope: unit
    outcome: passed
    code_snapshot: 7369235697c19101619fe77461ac09a556c20ad537e16384e1c7831c5c99924f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T19:04:51.047Z'
    finished_at: '2026-10-28T19:04:51.154Z'
    artifact_digest: 27bac392e680b27e3f57560b4b14895ad5903cd497f1683f3d3ca5da3e227648
    contract_hash: 0c7ba591d136de2d5e3af33ff033a7de3dea68952a093a8563a1974360b2b3b0
    binding_hash: b32063a933e4692bdb1c558678e0fd5fc6ac991be1f1283ca5cdcf723763b673
    fingerprint: b857934871ea2701f1b5c3ed3b9e0cda1381b76577a7225353eb7476656949ff
    fingerprint_components:
      contract: 0c7ba591d136de2d5e3af33ff033a7de3dea68952a093a8563a1974360b2b3b0
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
      - symbol_id: SYM-proof-engine-protocol-version
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
      test_id: TEST-proof-engine-protocol-version
      variable: protocol_version
      value_type: int
      assumptions:
        - operator: eq
          value: 1
      claim:
        operator: eq
        value: 1
    certificate_digest: 1806581d125553d7161831bf9c5828d84227740149c7b702e94a1893b89b4e0d
    claim_bindings:
      - claim_key: CLAIM-C5EC0AC1175F7801
        requirement_id: REQ-engine-protocol-settings
        fact_id: FACT-engine-protocol-version
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 1
          value_type: int
          variable: protocol_version
---
Proves that the engine protocol version shall be 1, against the code Kibi reads at ingest.