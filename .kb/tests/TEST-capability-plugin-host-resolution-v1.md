---
title: Capability plugin host resolution tests
status: passing
tags:
  - plugins
verification_scope: unit
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-capability-plugin-host-resolution-v1
      target: default
  success_policy: all_required_first_attempt
verification_perspective: internal
id: TEST-capability-plugin-host-resolution-v1
type: test
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 5): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f9845b6b2d4b4797f8836d3f
    test_id: TEST-capability-plugin-host-resolution-v1
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 52b30dc8725d33d780bcdffe5a493da60ce9b5ddc58f5a6af46e8b3b8368827e
    binding_hash: d989cd8847dca4b3e1df080920a6e4fcb4d50b647e29e0ed8d1a3e76bbc8899b
    fingerprint: fe7051796b5cc5e57c76d4505892a6fa613295124c3e47e8bb0351acd5b6475d
    fingerprint_components:
      contract: 52b30dc8725d33d780bcdffe5a493da60ce9b5ddc58f5a6af46e8b3b8368827e
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
      - symbol_id: SYM-unit-test-capability-plugin-host-resolution-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
# TEST-capability-plugin-host-resolution-v1

Automated coverage: packages/cli/tests/plugins/capability-plugin-host.test.ts

## Context
Resolution follows each package manager's rules (npm, pnpm symlinks, Yarn PnP) and must reject paths, globals and undeclared packages. These host tests cover those cases. Source: docs/plugin-development.md, "Activation".
