---
title: 'The Kibi ice brand colour shall be #a2d3f4, by a regex proof'
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
    - symbol_id: SYM-proof-brand-ice-color
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-report-brand-tokens
    export: KIBI_BRAND.ice
  proves:
    - CLAIM-D2446B9AFF8ECBA9
origin:
  kind: agent
  recorded_at: '2026-10-28T22:28:59.114Z'
id: TEST-proof-brand-ice-color
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-67d4c755f879f8fb62effb12
    test_id: TEST-proof-brand-ice-color
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 85be41d994299b4bdeb82e6443574b9327d72ec7fb93b6a23a47c16c95aa5d01
    binding_hash: a7945b80b0aafd261de1d4efd37248b699e62edc84ff0f49a02716ccc285dcad
    fingerprint: 0808ac9b9732a81c70d402e03fa5e750fb3f9c3f04f876c6c6fa38130950d254
    fingerprint_components:
      contract: 85be41d994299b4bdeb82e6443574b9327d72ec7fb93b6a23a47c16c95aa5d01
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
      - symbol_id: SYM-proof-brand-ice-color
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
      test_id: TEST-proof-brand-ice-color
      pattern:
        symbol_id: SYM-cli-report-brand-tokens
        type: string
        value: '#a2d3f4'
    certificate_digest: 7cfe35c2b20474e7b26e81e62e1863d897b0124420635165c5f59fec9db32e14
    claim_bindings:
      - claim_key: CLAIM-D2446B9AFF8ECBA9
        requirement_id: REQ-kibi-report-brand-colors
        fact_id: FACT-brand-ice-color
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: '#a2d3f4'
---
Proves that the Kibi ice brand colour shall be #a2d3f4, against the code Kibi reads at ingest.