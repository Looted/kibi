---
title: kibi engine janitor workspace socket sweep tests
status: passing
priority: should
verification_scope: end_to_end
verification_perspective: internal
tags:
  - cli
  - engine
  - janitor
origin:
  kind: agent
  recorded_at: '2026-11-22T15:54:10.723Z'
id: TEST-cli-engine-janitor-workspace-sockets
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-cli-engine-janitor-workspace-sockets
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d4b0c74375c35560a7a38c21
    test_id: TEST-cli-engine-janitor-workspace-sockets
    scope: end_to_end
    outcome: passed
    code_snapshot: 467aeb4abcb80e7dbda33f013971ae6d8f4699fd087703be681ad948884c0539
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-22T15:56:29.876Z'
    finished_at: '2026-11-22T15:56:30.196Z'
    artifact_digest: 39a11ddac5fd291cb1f1ef8e56e0d068ce15d1e12bb2e031c97bafe108169718
    contract_hash: 2e55b04670cc0a8e4614434a55aa41c361c61be8e024645d0cc4a12b4a4a875a
    binding_hash: 3ff42fd95ddd599746d1b5751a7e96171a8917924466bdea834e54d3ca93fb8a
    fingerprint: a8b525c85769c860ae087776b1e649769e4810c6b2cfeea6b0fd3188132d1aca
    fingerprint_components:
      contract: 2e55b04670cc0a8e4614434a55aa41c361c61be8e024645d0cc4a12b4a4a875a
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
      - symbol_id: SYM-test-cli-engine-janitor-workspace-sockets
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Behavioral test suite in `packages/cli/tests/prolog/janitor.test.ts` verifying that `sweepRuntimeSockets` and `runJanitor` inspect and remove the current workspace dead sockets by default while keeping live sockets and leaving other workspaces untouched unless `--all` is passed (GitHub issue #829, item 3 janitor half).
