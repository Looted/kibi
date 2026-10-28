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
    receipt_id: PR-ed28e8ba4cb42d01e1886a8d
    test_id: TEST-proof-detached-head-code
    scope: unit
    outcome: passed
    code_snapshot: 6c1d4b48c8c790bbc509e46899ccd457757c7db5641cef07df4b567f347481bf
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:44:58.141Z'
    finished_at: '2026-10-28T20:44:58.263Z'
    artifact_digest: 98bb7e7360ba51651755b2b0d29fd2c7e56f7bc556e3d0184563dc4f70a053c4
    contract_hash: a82d33b43580c6b7268747f85c7374659dc859274a10dc231d227a7e784b18a1
    binding_hash: ee6316f0580246e16482c24fb3a0066d28332b8b89099c89b4df1a979f525079
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