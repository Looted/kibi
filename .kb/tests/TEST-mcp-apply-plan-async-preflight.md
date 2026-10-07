---
title: Asynchronous plan apply preflight tests
status: active
priority: must
tags:
  - mcp
  - bootstrap
  - apply
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-mcp-apply-plan-async-preflight
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-07T19:01:28.649Z'
id: TEST-mcp-apply-plan-async-preflight
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-f6c61d5bd1ae13166868786f
    test_id: TEST-mcp-apply-plan-async-preflight
    scope: end_to_end
    outcome: passed
    code_snapshot: 5bcd0d322a2e6c7d354ab67006c2435d002496d92294aa2d93965813f4aabe00
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-07T19:05:22.838Z'
    finished_at: '2026-10-07T19:05:23.276Z'
    artifact_digest: 0895d3d0962b89ca4112695d7029f56d9c7e88f56137c9360b1af360f32a8e91
    contract_hash: dcfb6a89a323b7967bcfb849d6051f5ccc4beb84dedb8b7855d14ea26c267ff2
    binding_hash: 28e463d9fb098ec3081fe41d5b4be93fae496fb37d5abaaaaf728cef319ce330
    fingerprint: 4b9d15ecb80541bb0a3900343462d8b92d8213205d9646c8849cf485986791aa
    fingerprint_components:
      contract: dcfb6a89a323b7967bcfb849d6051f5ccc4beb84dedb8b7855d14ea26c267ff2
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
      - symbol_id: SYM-test-mcp-apply-plan-async-preflight
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
Runs `packages/mcp/tests/server/kb-apply-plan-async-preflight.test.ts`, which calls the registered `kb_apply_plan` handler with `async: true` and a bootstrap plan whose approved hash is missing, malformed, or mismatched, and checks that the call fails and the apply never runs.
