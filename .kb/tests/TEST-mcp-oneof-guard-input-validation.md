---
title: MCP oneOf guard input validation tests
status: passing
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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-36ede1b6650dfa80d040a713
    test_id: TEST-mcp-oneof-guard-input-validation
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: d0ad699f272df4631593d432fd4f9244275cb1009108809192dc326aa42a5796
    binding_hash: 2c612a1313d59ac9b61c661547ddb0a6bece02e0e46b9abed65927292b5daac6
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
    kind: e2e
    evidence_level: tested
---
Runs `packages/mcp/tests/server/oneof-guard-input-validation.test.ts`, which converts the published `kb_apply_plan` and `kb_delete` input schemas with the MCP converter and checks that no-match and multiple-match inputs are rejected while each single-branch input passes.
