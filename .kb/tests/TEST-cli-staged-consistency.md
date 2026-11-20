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
    receipt_id: PR-30254eec9e3918656acdd297
    test_id: TEST-cli-staged-consistency
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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
