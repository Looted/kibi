---
title: Consumer CLI staged check blocks an introduced infeasible scenario and passes an unrelated change over a committed one
status: passing
priority: must
tags:
  - check
  - staged
  - scenario-feasibility
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-cli-staged-consistency
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-cli-staged-consistency
    target: default
    native_id: packages/cli/tests/consumer/staged-consistency.test.ts::kibi check --staged consistency::blocks a staged infeasible scenario and ignores one already committed
    source_file: packages/cli/tests/consumer/staged-consistency.test.ts
    line: 57
origin:
  kind: agent
  recorded_at: '2026-10-06T18:18:37.260Z'
id: TEST-cli-staged-consistency
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-3b79d82c760d9637dd2791d3
    test_id: TEST-cli-staged-consistency
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 8b8500bf372cdec2689745e11f5d012f74cdfb789c37ab56dd763a4db95b831d
    binding_hash: 2ec778e9b0e3ac6e4396bce3e8f021186ac6a5c0f8f6f358970f97387a11bd76
    fingerprint: 31a5ce022fa1f36eb62abc681c3ef46ac3d991c2faefe26dea09e36dcfd4ec24
    fingerprint_components:
      contract: 8b8500bf372cdec2689745e11f5d012f74cdfb789c37ab56dd763a4db95b831d
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 8734107baac2daf1c27fc2eb18ae62b20fad171762348c819296cc0c20ac8364
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-cli-staged-consistency
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Consumer test for REQ-cli-staged-consistency (SCEN-cli-staged-consistency). It runs `kibi check --staged --format json` in a temporary consumer Git workspace and asserts two observable outcomes. Staging a success scenario that a current requirement forbids exits with status 1 and a single scenario-feasibility violation on that scenario. After that state is committed, staging an unrelated change exits with status 0 and no violations.

It exercises the real staged projection (a temporary KB built from the staged tree), so a pass means the pre-commit hook behaves that way for a user. The blocking case depends on the projection carrying the scenario's expected outcome, which commit 21b889a4 also fixed.
