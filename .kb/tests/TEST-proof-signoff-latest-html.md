---
title: The latest Kibi signoff HTML view file shall be .kb/briefs/signoff/latest.html, by a regex proof
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
    - symbol_id: SYM-proof-signoff-latest-html
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  proves:
    - CLAIM-AA3C3D26C6085FD5
  pattern_source:
    symbol_id: SYM-cli-signoff-model-signoff-latest-html
origin:
  kind: agent
  recorded_at: '2026-10-30T19:41:19.891Z'
id: TEST-proof-signoff-latest-html
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-652c72e7a3b330b97c88dc72
    test_id: TEST-proof-signoff-latest-html
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: e6ea840967790183d14fbb5aa6b11fe8f6fb1e8989e1028d181d3e75ddb253e7
    binding_hash: 46e5d574e700153bd26a5316f58d7764631381a0988ee3e808fdc0f26288551e
    fingerprint: 987aec72a3d2c9e099275a61b6ec714553264cb577f406b56d6ba0f832b6fec1
    fingerprint_components:
      contract: e6ea840967790183d14fbb5aa6b11fe8f6fb1e8989e1028d181d3e75ddb253e7
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
      - symbol_id: SYM-proof-signoff-latest-html
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
      test_id: TEST-proof-signoff-latest-html
      pattern:
        symbol_id: SYM-cli-signoff-model-signoff-latest-html
        type: string
        value: .kb/briefs/signoff/latest.html
    certificate_digest: a573bfd72b2a28a3b8b42302afcbba24e245c7cf0f64fe258fbc9db8da9a91ec
    claim_bindings:
      - claim_key: CLAIM-AA3C3D26C6085FD5
        requirement_id: REQ-signoff-latest-views
        fact_id: FACT-signoff-latest-html
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: .kb/briefs/signoff/latest.html
---
Proves that the latest Kibi signoff HTML view file shall be .kb/briefs/signoff/latest.html, against the code Kibi reads at ingest.