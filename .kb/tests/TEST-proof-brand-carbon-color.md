---
title: 'The Kibi carbon brand colour shall be #1d1e23, by a regex proof'
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
    - symbol_id: SYM-proof-brand-carbon-color
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-report-brand-tokens
    export: KIBI_BRAND.carbon
  proves:
    - CLAIM-8C7E4BA35F56F1A5
origin:
  kind: agent
  recorded_at: '2026-10-28T22:28:10.167Z'
id: TEST-proof-brand-carbon-color
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-92a5b4fbe7daa90918c16a60
    test_id: TEST-proof-brand-carbon-color
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 4b5a98c8670f62d849976ac11d0648851717ff855ddccd2ded072e3044ef39d6
    binding_hash: 2ea5fe27c3c2d11cdff355de2b248450b3da6e2d6e9b7d4236cfb35e50f554c1
    fingerprint: a236aa639d064e05be3f8fa7c7cb07a2b2b7ab034c790396a042dbc736b8abfc
    fingerprint_components:
      contract: 4b5a98c8670f62d849976ac11d0648851717ff855ddccd2ded072e3044ef39d6
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
      - symbol_id: SYM-proof-brand-carbon-color
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
      test_id: TEST-proof-brand-carbon-color
      pattern:
        symbol_id: SYM-cli-report-brand-tokens
        type: string
        value: '#1d1e23'
    certificate_digest: 367beafcd608602ff83cda60255873e83b3653e2b770d052fa40414171e90e0c
    claim_bindings:
      - claim_key: CLAIM-8C7E4BA35F56F1A5
        requirement_id: REQ-kibi-report-brand-colors
        fact_id: FACT-brand-carbon-color
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: '#1d1e23'
---
Proves that the Kibi carbon brand colour shall be #1d1e23, against the code Kibi reads at ingest.