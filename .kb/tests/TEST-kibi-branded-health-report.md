---
title: Branded requirement health report and badge tests
status: active
tags:
  - cli
  - report
  - badge
  - brand
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
id: TEST-kibi-branded-health-report
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-cli-html-report
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-5f02389079a6be5d79290e5e
    test_id: TEST-kibi-branded-health-report
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 2f31254052a59a9fb46df94ddf4c6f43dff44ea0a598a852a1be4d8b139b509f
    binding_hash: e83dca8fa30c88fca84dc8d0dd3cf7f6f423f32abab3029762f0829685aeaf42
    fingerprint: 2f3df781634b239cd492e250ef08d6d1d03d12f3f8da40e0470916f004101c62
    fingerprint_components:
      contract: 2f31254052a59a9fb46df94ddf4c6f43dff44ea0a598a852a1be4d8b139b509f
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
      - symbol_id: SYM-e2e-packed-cli-html-report
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Covers canonical inline marks and tokens, exact proof ratio semantics, sequential earliest-blocker gate counts, accessible status text, responsive and print styling, self-contained output, and the generated branded SVG badge with Codecov-style chrome and a compact kibi label beside the logo.
