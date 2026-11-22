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
    receipt_id: PR-be613c01bd28af17025912c8
    test_id: TEST-cli-engine-janitor-workspace-sockets
    scope: end_to_end
    outcome: passed
    code_snapshot: 9531c6a2966f60fb6303c78479e6703044c63b4c62adda90745aefc7d3289a50
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-22T17:51:35.247Z'
    finished_at: '2026-11-22T17:51:35.581Z'
    artifact_digest: 75906fa0917e714ec10ba736971fe6de138cebf087a139e79b32f57b932b8e97
    contract_hash: 2e55b04670cc0a8e4614434a55aa41c361c61be8e024645d0cc4a12b4a4a875a
    binding_hash: 75f5c42d81ce28d75e3e4617415b873c06d9d65441764ceb5bd3f19112a818b6
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
