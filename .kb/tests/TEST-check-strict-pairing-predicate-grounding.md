---
title: Strict pairing predicate grounding tests
status: passing
priority: must
tags:
  - check
  - modeling
  - predicates
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-check-strict-pairing-predicate-grounding
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-08T15:33:58.255Z'
id: TEST-check-strict-pairing-predicate-grounding
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a608dd45ca9f28d9862fddc2
    test_id: TEST-check-strict-pairing-predicate-grounding
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: a69786424a2d829b18cd840d70e1e27b51dbb0867f3d5b69e275ca5b142ec37f
    binding_hash: 007529f7a89f204f010d0d46a12b4340d5b8649df98303c0ac51cc6912dcb159
    fingerprint: 0fc9e2b31aa9d580a01a5e4aa04ea56d5e71cc57f6692737ade4813ebe68b120
    fingerprint_components:
      contract: a69786424a2d829b18cd840d70e1e27b51dbb0867f3d5b69e275ca5b142ec37f
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
      - symbol_id: SYM-test-check-strict-pairing-predicate-grounding
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the Prolog `checks_coverage_gaps` pairing tests in `packages/core/tests/kb.plt` (a predicate about the constrained subject pairs it, a predicate about another subject does not, and strict readiness reports a single level) and the MCP stdio round trip in `packages/mcp/tests/predicate-plan-roundtrip.test.ts`, which applies a replacement plan unchanged and checks both the blocking and the advisory lane of `kb_check`.