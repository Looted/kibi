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
    receipt_id: PR-06b0ba3d908b588b30b20056
    test_id: TEST-proof-policy-markers-rule
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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