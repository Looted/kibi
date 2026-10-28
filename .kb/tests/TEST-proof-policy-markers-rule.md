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
    receipt_id: PR-87038dfa503c56f20320e598
    test_id: TEST-proof-policy-markers-rule
    scope: unit
    outcome: passed
    code_snapshot: 1527b4cbcc3ade2f38aa86a1134590cb549c79eb8db739cb67bcdea1f5054201
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:24:45.585Z'
    finished_at: '2026-10-28T20:24:45.752Z'
    artifact_digest: 3655b2138dea7d683453a4a9262d5e5f2f322660cddce03aefad3027c05be7dd
    contract_hash: 75a20def3ea97d2d966c7edc1e7a331e6df222717cd2fec170407265dcc647ab
    binding_hash: 24c81f4b7cec4738030dfe362e01758fee64008a9f81bde1cc72840280eae1bd
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
        requirement_id: REQ-kibi-check-rule-names
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