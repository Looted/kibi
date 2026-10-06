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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-65f46b4ddf5645ec832c4a14
    test_id: TEST-cli-staged-consistency
    scope: end_to_end
    outcome: passed
    code_snapshot: fb61e675e7ac34900a14b7190c4c1a61ca293f8e5d6ba460d7b280c07f80b94f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-06T19:18:24.282Z'
    finished_at: '2026-10-06T19:18:32.689Z'
    artifact_digest: 45f56c68c18772f11aed6c019e54f3e7e140863a5e98b65235425fcef473f19a
    contract_hash: 8b8500bf372cdec2689745e11f5d012f74cdfb789c37ab56dd763a4db95b831d
    binding_hash: a88d346ae84251720f260c558eb9929301282978a81f49ba6c37a583f89ae362
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
---
