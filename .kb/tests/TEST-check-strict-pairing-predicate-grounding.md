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
    receipt_id: PR-d9da54393bfdad470801368a
    test_id: TEST-check-strict-pairing-predicate-grounding
    scope: end_to_end
    outcome: passed
    code_snapshot: 3464ae42f083c2b6e9ed9b482fa7e54f58e94f0d5628e4ace6c2f8d99ecacd37
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-08T21:30:46.081Z'
    finished_at: '2026-10-08T21:30:52.229Z'
    artifact_digest: e3e67400745b385faef1d540ddb8cf48f7886d2b4c68975dba9fd2545e1a68b1
    contract_hash: a69786424a2d829b18cd840d70e1e27b51dbb0867f3d5b69e275ca5b142ec37f
    binding_hash: 57f48dd2edec26dcba3139d123025eaf16cacd7fadc0ab792529ac9d45e6f3e2
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