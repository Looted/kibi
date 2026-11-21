---
title: The signoff label of the e2e gate shall be no end-to-end test yet, by a regex proof
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
    - symbol_id: SYM-proof-signoff-gate-e2e-label
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-signoff-model-signoff-gate-labels
    export: SIGNOFF_GATE_LABELS.e2e
  proves:
    - CLAIM-91CB54BAA02C246A
origin:
  kind: agent
  recorded_at: '2026-10-28T22:23:18.289Z'
id: TEST-proof-signoff-gate-e2e-label
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-050b975c29def06bc22b4f39
    test_id: TEST-proof-signoff-gate-e2e-label
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 71d727bb0084b86cf1ebb0c9ccb1eb3c0cdb08ab00e7db9fc18b247351f198f0
    binding_hash: 828497f1e45ba20acf6287e9ef590a1a687acf115f2606386d3a4bb6797210e3
    fingerprint: 5fa53d07041bb7d1d1b04d2d88a615d8e69592adb4d051f02e19afc41973d9c1
    fingerprint_components:
      contract: 71d727bb0084b86cf1ebb0c9ccb1eb3c0cdb08ab00e7db9fc18b247351f198f0
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
      - symbol_id: SYM-proof-signoff-gate-e2e-label
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
      test_id: TEST-proof-signoff-gate-e2e-label
      pattern:
        symbol_id: SYM-cli-signoff-model-signoff-gate-labels
        type: string
        value: no end-to-end test yet
    certificate_digest: 430d50422f5e0379ed66e23bd3a3fb5527d87e0fba812ee11560508529b2a32a
    claim_bindings:
      - claim_key: CLAIM-91CB54BAA02C246A
        requirement_id: REQ-kibi-signoff-labels
        fact_id: FACT-signoff-gate-e2e-label
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: no end-to-end test yet
---
Proves that the signoff label of the e2e gate shall be no end-to-end test yet, against the code Kibi reads at ingest.