---
title: The policy markers rule shall be policy-markers, by a regex proof
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
    - symbol_id: SYM-proof-policy-markers-rule
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-policy-markers-rule
  proves:
    - CLAIM-B7F45C2F4CC9E21A
origin:
  kind: agent
  recorded_at: '2026-10-28T20:22:10.860Z'
id: TEST-proof-policy-markers-rule
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-37b18d81fdecc7eb9097be90
    test_id: TEST-proof-policy-markers-rule
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 75a20def3ea97d2d966c7edc1e7a331e6df222717cd2fec170407265dcc647ab
    binding_hash: e290c82885b581dfda4b3547a0932cd6f20e2b7c7eb34373ba29cd212cad6642
    fingerprint: 2c6cd59aef7f9e1e61b50cd24d3cf76b53321065209dcb1d76e996b748e163c7
    fingerprint_components:
      contract: 75a20def3ea97d2d966c7edc1e7a331e6df222717cd2fec170407265dcc647ab
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
      - symbol_id: SYM-proof-policy-markers-rule
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
      test_id: TEST-proof-policy-markers-rule
      pattern:
        symbol_id: SYM-const-policy-markers-rule
        type: string
        value: policy-markers
    certificate_digest: 5d5392dd1e8255084dc91806afe6c9a533993f13790ca30286e385d732021ebf
    claim_bindings:
      - claim_key: CLAIM-B7F45C2F4CC9E21A
        requirement_id: REQ-kibi-policy-rule-names
        fact_id: FACT-policy-markers-rule
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: policy-markers
---
Proves that the policy markers rule shall be policy-markers, against the code Kibi reads at ingest.