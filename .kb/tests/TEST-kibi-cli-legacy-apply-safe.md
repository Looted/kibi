---
title: kibi migrate --apply-safe migrates a legacy branch store from its previewed plan
status: pending
priority: must
tags:
  - branching
  - migration
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-kibi-cli-legacy-apply-safe
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-15T17:00:00.000Z'
id: TEST-kibi-cli-legacy-apply-safe
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-302c6a05421b413bb3d20381
    test_id: TEST-kibi-cli-legacy-apply-safe
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 04ecc74ae76309468a50a6cd4d52e4bb22bac0340b3a9a60d3c863323d256100
    binding_hash: 722f4fd9e34e5b18ace8923fe18590d6fa726e1b2cb7e45cb00c4dc4b8dfc213
    fingerprint: 7f323a4b7466964ce33aafb33ce49787055be0288295fd32dac96ba5e10aaf35
    fingerprint_components:
      contract: 04ecc74ae76309468a50a6cd4d52e4bb22bac0340b3a9a60d3c863323d256100
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
      - symbol_id: SYM-e2e-test-kibi-cli-legacy-apply-safe
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Packed end-to-end test documentation/tests/e2e/packed/legacy-attachment-cli-apply.test.ts: in an installed project it moves the compiled store to its legacy literal path, then checks that kibi query, kibi check and kibi engine status are refused with directions to kibi migrate --apply-safe and create no hashed store. It previews the plan with kibi migrate --format json, checks that no hashed store exists and that the plan holds no branch store recovery, applies the plan's hash with kibi migrate --apply-safe, and checks that the legacy migration applied, no recovery ran, only the hashed store remains and kibi query still returns the requirement.