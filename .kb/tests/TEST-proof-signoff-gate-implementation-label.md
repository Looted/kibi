---
title: The signoff label of the implementation gate shall be no owning code yet, by a regex proof
status: passing
tags:
  - proof
  - certificate
  - regex
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-signoff-gate-implementation-label
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-signoff-model-signoff-gate-labels
    export: SIGNOFF_GATE_LABELS.implementation
  proves:
    - CLAIM-55563572F4FF1450
origin:
  kind: agent
  recorded_at: '2026-10-28T22:22:59.133Z'
id: TEST-proof-signoff-gate-implementation-label
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-dc57fddf1c92a00bc547cf90
    test_id: TEST-proof-signoff-gate-implementation-label
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 9c1ca45aacce30167a9bb898bde1053dd18e46049b49f0f0255e18b59ec46af6
    binding_hash: 865139f7c564a2e6b4ce1e40f8fcf57282b3af2da564657b5c98a07399e29fa0
    fingerprint: 22322f0c49a1599cb5aa94651a436044e921f1256d8909f4a426b63eb396f31d
    fingerprint_components:
      contract: 9c1ca45aacce30167a9bb898bde1053dd18e46049b49f0f0255e18b59ec46af6
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
      - symbol_id: SYM-proof-signoff-gate-implementation-label
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: regex
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: regex
      test_id: TEST-proof-signoff-gate-implementation-label
      pattern:
        symbol_id: SYM-cli-signoff-model-signoff-gate-labels
        type: string
        value: no owning code yet
    certificate_digest: 4b34beb4bcbcf3c0be6bd8a38c641bb9f9d37be0db1b20ac63f3e4b3f1d94a99
    claim_bindings:
      - claim_key: CLAIM-55563572F4FF1450
        requirement_id: REQ-kibi-signoff-labels
        fact_id: FACT-signoff-gate-implementation-label
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: no owning code yet
---
Proves that the signoff label of the implementation gate shall be no owning code yet, against the code Kibi reads at ingest.