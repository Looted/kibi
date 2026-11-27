---
title: The missing context tag code shall be context_missing_tag, by a regex proof
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
    - symbol_id: SYM-proof-context-missing-tag-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-context-missing-tag-code
  proves:
    - CLAIM-D062BE9E6D27EA1F
origin:
  kind: agent
  recorded_at: '2026-10-28T20:29:51.703Z'
id: TEST-proof-context-missing-tag-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c0a1df4c1981cd44bf1bf482
    test_id: TEST-proof-context-missing-tag-code
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 42b9a974602fadddddb67464bde48681a23f18320e6cb3fa999004894497d5cd
    binding_hash: 77e6fde00c716ff03865418113d26e67af05eba63a13f89c45d8ea9c94484dff
    fingerprint: 58e0fc4e89d1fc44a2b25d624809d4c80f962ea6c308290171ce3073dcdaf47f
    fingerprint_components:
      contract: 42b9a974602fadddddb67464bde48681a23f18320e6cb3fa999004894497d5cd
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
      - symbol_id: SYM-proof-context-missing-tag-code
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
      test_id: TEST-proof-context-missing-tag-code
      pattern:
        symbol_id: SYM-const-context-missing-tag-code
        type: string
        value: context_missing_tag
    certificate_digest: cb0c1344873f78989365303c74d800867a2b502daf44c37ca54df7ebb224d9f1
    claim_bindings:
      - claim_key: CLAIM-D062BE9E6D27EA1F
        requirement_id: REQ-cli-migration-context-codes
        fact_id: FACT-context-missing-tag-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: context_missing_tag
---
Proves that the missing context tag code shall be context_missing_tag, against the code Kibi reads at ingest.