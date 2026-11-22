---
title: Staged check owner block tests
status: passing
priority: must
verification_scope: end_to_end
tags:
  - check
  - staged
origin:
  kind: agent
  recorded_at: '2026-11-16T16:50:00.000Z'
id: TEST-check-staged-owner-block
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-check-staged-owner-block
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-cefa2e0ca112c6829628ec3a
    test_id: TEST-check-staged-owner-block
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: af9d54f79b2aec4cb0906201341674d0a4cdaf63919b71ebb149e0aafe9bdf05
    binding_hash: 5269293fdf86246a07fcc3fc5f12fcaa44169df3d1df93f97a1b3baffb3d093b
    fingerprint: 363b8d11604c5c8548a70679867ea05869e0452d5373bc66cbf851a6f7d71fef
    fingerprint_components:
      contract: af9d54f79b2aec4cb0906201341674d0a4cdaf63919b71ebb149e0aafe9bdf05
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
      - symbol_id: SYM-test-check-staged-owner-block
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
verification_perspective: consumer
---
Runs the owner-findings unit tests, the staged verdict tests and the staged impact enforcement tests through the CLI: one new unowned function gives one blocking block with its candidate requirements and a paste-ready kb_upsert input, the merged findings are not printed, and the JSON result keeps them with ownerFindings.