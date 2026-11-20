---
title: Asynchronous plan apply preflight tests
status: passing
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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-aa5ea289230de792d006e713
    test_id: TEST-mcp-apply-plan-async-preflight
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: dcfb6a89a323b7967bcfb849d6051f5ccc4beb84dedb8b7855d14ea26c267ff2
    binding_hash: 71cb631805827aa9b1d5fa3d550e84a5a8e4a52ae77f5342d253fd150e31f173
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
    kind: e2e
    evidence_level: tested
---
Runs `packages/mcp/tests/server/kb-apply-plan-async-preflight.test.ts`, which calls the registered `kb_apply_plan` handler with `async: true` and a bootstrap plan whose approved hash is missing, malformed, or mismatched, and checks that the call fails and the apply never runs.
