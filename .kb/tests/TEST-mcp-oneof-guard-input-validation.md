---
title: MCP oneOf guard input validation tests
status: active
priority: must
tags:
  - mcp
  - validation
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-mcp-oneof-guard-input-validation
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-07T19:01:06.772Z'
id: TEST-mcp-oneof-guard-input-validation
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-dc3eaa4c00d632a1ff8e7cc7
    test_id: TEST-mcp-oneof-guard-input-validation
    scope: end_to_end
    outcome: passed
    code_snapshot: 5bcd0d322a2e6c7d354ab67006c2435d002496d92294aa2d93965813f4aabe00
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-07T19:05:14.216Z'
    finished_at: '2026-10-07T19:05:14.554Z'
    artifact_digest: 29dac29191795fdbb6d925d9b54cb5f0966d86a12c67fb71585dce79c95bee6f
    contract_hash: d0ad699f272df4631593d432fd4f9244275cb1009108809192dc326aa42a5796
    binding_hash: 97c7c0e223b9782736ea490fa837249df70d7c015dc4771c5a28c41239eb3ac0
    fingerprint: f90cc95b09205b463bd6b60c4efe1c3d304f4c293740a984c4d70a521df4929e
    fingerprint_components:
      contract: d0ad699f272df4631593d432fd4f9244275cb1009108809192dc326aa42a5796
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
      - symbol_id: SYM-test-mcp-oneof-guard-input-validation
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
Runs `packages/mcp/tests/server/oneof-guard-input-validation.test.ts`, which converts the published `kb_apply_plan` and `kb_delete` input schemas with the MCP converter and checks that no-match and multiple-match inputs are rejected while each single-branch input passes.
