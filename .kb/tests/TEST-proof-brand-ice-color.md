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
    receipt_id: PR-5133c32519ada4bd50e9aa7e
    test_id: TEST-proof-brand-ice-color
    scope: unit
    outcome: passed
    code_snapshot: 0a46a168f79f32c7067fd54b62e7bfea277eb1d3f88ddceab97c98613f8e5f74
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:32:39.131Z'
    finished_at: '2026-10-28T22:32:39.266Z'
    artifact_digest: b6c1fa4943e940fbfc394348eab40dbf5e1d592e5852c59a1050eb7c0dda84a4
    contract_hash: 85be41d994299b4bdeb82e6443574b9327d72ec7fb93b6a23a47c16c95aa5d01
    binding_hash: c31814fea05942ab598c2a2c0fc6ed1bbed67ebec02c244ed0b123b58fd500d0
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