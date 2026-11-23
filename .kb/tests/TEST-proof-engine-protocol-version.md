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
    receipt_id: PR-4538321abb9507ac55527893
    test_id: TEST-proof-engine-protocol-version
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 0c7ba591d136de2d5e3af33ff033a7de3dea68952a093a8563a1974360b2b3b0
    binding_hash: ddaa76ee341bd9bb812acf6611465f0e721012682e62df20df06d47c4b883f3b
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