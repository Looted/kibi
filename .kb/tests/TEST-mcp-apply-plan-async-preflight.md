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
    receipt_id: PR-161ccde0f9bb793073a1cd7d
    test_id: TEST-mcp-apply-plan-async-preflight
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
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
