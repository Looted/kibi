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
    receipt_id: PR-88b126de24e742693d38684c
    test_id: TEST-proof-detached-head-code
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
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