---
title: The search hints embedding model revision shall be bf8b056651a2c21b8d2565580b8569da283cab23, by a regex proof
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
    - symbol_id: SYM-proof-search-hints-model-revision
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  proves:
    - CLAIM-1B88D98CB3D0A5CB
  pattern_source:
    symbol_id: SYM-const-search-hints-model-revision
origin:
  kind: agent
  recorded_at: '2026-10-30T19:40:32.148Z'
id: TEST-proof-search-hints-model-revision
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-9a41427090c34910acdb6672
    test_id: TEST-proof-search-hints-model-revision
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: f8ffe04f1d519a2c2c4158d0843062a0515844c2c8c0e2b68116fc60e561b2a0
    binding_hash: cedea82c5eb842dd1f6c1c052968186b2509acf75b14ae0967f5d3726c173c25
    fingerprint: 8c9a711def2d3e0da3e6014b08835548fe97e3ed8a98de48989bd34097a3a620
    fingerprint_components:
      contract: f8ffe04f1d519a2c2c4158d0843062a0515844c2c8c0e2b68116fc60e561b2a0
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
      - symbol_id: SYM-proof-search-hints-model-revision
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
      test_id: TEST-proof-search-hints-model-revision
      pattern:
        symbol_id: SYM-const-search-hints-model-revision
        type: string
        value: bf8b056651a2c21b8d2565580b8569da283cab23
    certificate_digest: 87019b863df411a858baf49866909c63d614f194bdfab3a6d3aafaf9ff601405
    claim_bindings:
      - claim_key: CLAIM-1B88D98CB3D0A5CB
        requirement_id: REQ-search-hints-model-pin
        fact_id: FACT-search-hints-model-revision
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: bf8b056651a2c21b8d2565580b8569da283cab23
---
Proves that the search hints embedding model revision shall be bf8b056651a2c21b8d2565580b8569da283cab23, against the code Kibi reads at ingest.