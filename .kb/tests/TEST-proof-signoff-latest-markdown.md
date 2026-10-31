---
title: The latest Kibi signoff Markdown view file shall be .kb/briefs/signoff/latest.md, by a regex proof
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
    - symbol_id: SYM-proof-signoff-latest-markdown
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  proves:
    - CLAIM-35056AE430E48351
  pattern_source:
    symbol_id: SYM-cli-signoff-model-signoff-latest-markdown
origin:
  kind: agent
  recorded_at: '2026-10-30T19:41:11.673Z'
id: TEST-proof-signoff-latest-markdown
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-ac8e4b4ba41a6429e43a9e4a
    test_id: TEST-proof-signoff-latest-markdown
    scope: unit
    outcome: passed
    code_snapshot: e2663d10a2e1a0b8fdd0d38e888ee46d8031436be2244a613e1c406fbfa714b0
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-30T19:45:43.540Z'
    finished_at: '2026-10-30T19:45:43.694Z'
    artifact_digest: 7f53e7c305cd92ca171632fb3231655ee23a3f4e4174225e2ef2640aa0155296
    contract_hash: 5caa7081215490977e075271e524a92de40243752732b3c59e55f3f0f8700771
    binding_hash: 695b6e95c707f3fba443cc396739fceb735eabecb7ad3e85708222de7ec21644
    fingerprint: fa4efdf7443f7ad03a5899b84ce3b6f0b343deb969ef067d82f0ff1587ee5786
    fingerprint_components:
      contract: 5caa7081215490977e075271e524a92de40243752732b3c59e55f3f0f8700771
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
      - symbol_id: SYM-proof-signoff-latest-markdown
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
      test_id: TEST-proof-signoff-latest-markdown
      pattern:
        symbol_id: SYM-cli-signoff-model-signoff-latest-markdown
        type: string
        value: .kb/briefs/signoff/latest.md
    certificate_digest: d5c294404ff9372003c92d914a033380a699ad4147ba5579046bdb7af69193de
    claim_bindings:
      - claim_key: CLAIM-35056AE430E48351
        requirement_id: REQ-signoff-latest-views
        fact_id: FACT-signoff-latest-markdown
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: .kb/briefs/signoff/latest.md
---
Proves that the latest Kibi signoff Markdown view file shall be .kb/briefs/signoff/latest.md, against the code Kibi reads at ingest.