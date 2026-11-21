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
    receipt_id: PR-4427eec25c608660e3955ca5
    test_id: TEST-proof-signoff-latest-html
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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