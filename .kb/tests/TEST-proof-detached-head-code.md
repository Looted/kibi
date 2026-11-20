---
title: The detached HEAD read-only code shall be detached_head_read_only, by a regex proof
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
    - symbol_id: SYM-proof-detached-head-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-detached-head-read-only-code
  proves:
    - CLAIM-D4A9191F93A55F69
origin:
  kind: agent
  recorded_at: '2026-10-28T20:42:31.030Z'
id: TEST-proof-detached-head-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-ad525e3ff9c6ca669bb905f5
    test_id: TEST-proof-detached-head-code
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: a82d33b43580c6b7268747f85c7374659dc859274a10dc231d227a7e784b18a1
    binding_hash: d17e3053b22d97327746f115cf232dbda26a92f9a55ad8cbfcdfd3923c008cc1
    fingerprint: 31df3e4ddd02f9cdc88c43435d93004857cf9e0b2209e6abbfd402c3f2270be1
    fingerprint_components:
      contract: a82d33b43580c6b7268747f85c7374659dc859274a10dc231d227a7e784b18a1
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
      - symbol_id: SYM-proof-detached-head-code
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
      test_id: TEST-proof-detached-head-code
      pattern:
        symbol_id: SYM-const-detached-head-read-only-code
        type: string
        value: detached_head_read_only
    certificate_digest: da5b5d54b0e8c9d697a3b9aa8748fa7e724d7f28a95ef44e59c59f046f56fabd
    claim_bindings:
      - claim_key: CLAIM-D4A9191F93A55F69
        requirement_id: REQ-branch-store-settings
        fact_id: FACT-detached-head-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: detached_head_read_only
---
Proves that the detached HEAD read-only code shall be detached_head_read_only, against the code Kibi reads at ingest.