---
title: The engine shall give Prolog 1000 milliseconds to exit, by an arithmetic proof
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
    - symbol_id: SYM-proof-engine-exit-grace
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-const-engine-prolog-exit-grace-ms
  proves:
    - CLAIM-9393D46F1A874F0D
origin:
  kind: agent
  recorded_at: '2026-10-28T20:46:32.808Z'
id: TEST-proof-engine-exit-grace
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-4c29f94458e3c5255cb0b2fa
    test_id: TEST-proof-engine-exit-grace
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 6d4dcd2eade2841a2bc5399dbab0ddab23b4513b01328a1cdb7a2526ab950d0d
    binding_hash: 6268613ad24b51e16449cfdde86ee0d3118ba45f7df73dfe797d3e1aeb124ff3
    fingerprint: 5dd119ecb5a79451639ca8b331aaeb955feb1e44fcf0300e2b53f02ee6bf2172
    fingerprint_components:
      contract: 6d4dcd2eade2841a2bc5399dbab0ddab23b4513b01328a1cdb7a2526ab950d0d
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
      - symbol_id: SYM-proof-engine-exit-grace
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
      test_id: TEST-proof-engine-exit-grace
      variable: exit_grace_ms
      value_type: int
      assumptions:
        - operator: eq
          value: 1000
      claim:
        operator: eq
        value: 1000
    certificate_digest: 7004f5efea8c3bc26adfd7cbebefc976c1566a3970354baad9ff2b2f88f25678
    claim_bindings:
      - claim_key: CLAIM-9393D46F1A874F0D
        requirement_id: REQ-engine-timing-settings
        fact_id: FACT-engine-exit-grace
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 1000
          value_type: int
          variable: exit_grace_ms
---
Proves that the engine shall give Prolog 1000 milliseconds to exit, against the code Kibi reads at ingest.