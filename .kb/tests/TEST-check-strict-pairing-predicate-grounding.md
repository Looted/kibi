---
title: Strict pairing predicate grounding tests
status: active
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-92793e6326cd227762c1d3dd
    test_id: TEST-check-strict-pairing-predicate-grounding
    scope: end_to_end
    outcome: passed
    code_snapshot: 6cca97613441c1fbaabc1ae371ee3f303736b4d4b1a0c6d7c908439c9eabb06d
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-08T16:06:20.763Z'
    finished_at: '2026-10-08T16:06:25.295Z'
    artifact_digest: 098b5b89b3ee2fb4d6877bb5c5721896c443ad7ebacd81b855dd2b756023c0f7
    contract_hash: a69786424a2d829b18cd840d70e1e27b51dbb0867f3d5b69e275ca5b142ec37f
    binding_hash: 9e371bec08e62c9235f4abf40132c6b4b5b9031f7fa3e0c6b6b8e4851bbc1a1e
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
---
Runs the Prolog `checks_coverage_gaps` pairing tests in `packages/core/tests/kb.plt` (a predicate about the constrained subject pairs it, a predicate about another subject does not, and strict readiness reports a single level) and the MCP stdio round trip in `packages/mcp/tests/predicate-plan-roundtrip.test.ts`, which applies a replacement plan unchanged and checks both the blocking and the advisory lane of `kb_check`.