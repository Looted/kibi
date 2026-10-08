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
---
Runs the Prolog `checks_coverage_gaps` pairing tests in `packages/core/tests/kb.plt` (a predicate about the constrained subject pairs it, a predicate about another subject does not, and strict readiness reports a single level) and the MCP stdio round trip in `packages/mcp/tests/predicate-plan-roundtrip.test.ts`, which applies a replacement plan unchanged and checks both the blocking and the advisory lane of `kb_check`.