---
title: Result budget tests over MCP and the CLI JSON route
status: passing
priority: must
tags:
  - result-budget
  - mcp
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-result-budget
      target: default
  success_policy: all_required_first_attempt
id: TEST-kibi-result-budget
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c2bb0bcf8d46c90b67be1273
    test_id: TEST-kibi-result-budget
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: a3dedc0d60abd765bedb477b083e9744ba3e819094e8e0a0e4d0e74e2751c806
    binding_hash: afb176214ee6f2fe4834fafdaad8225201c61fd435f0ac613b0549d20df9ee18
    fingerprint: 3fd8d0220569abc5aa9eefbc2332efcbf42e3c843ab14061f3cf42c032107ab8
    fingerprint_components:
      contract: a3dedc0d60abd765bedb477b083e9744ba3e819094e8e0a0e4d0e74e2751c806
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
      - symbol_id: SYM-test-kibi-result-budget
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the shared result fitter (packages/cli/tests/public/operations/result-budget.test.ts): a declaration for every catalog operation, rows cut to the 24,000-character budget with at least one row, a single oversized row cut with omittedFields, the paging marker, RESULT_TRUNCATED diagnostic and next action, and the RESULT_TOO_LARGE refusal of a read over 64,000 characters. It runs kb_coverage's own fit, summary rows and plan summaries, matched count and rounded check time (packages/cli/tests/public/operations/coverage-budget.test.ts), the paged rule selection of kb_check (packages/cli/tests/public-mutation/operations/check-format-budget.mutation.test.ts), kb_query summary rows (packages/cli/tests/public-mutation/operations/discovery-query.mutation.test.ts), and a kb_query cut to the budget over MCP and the built CLI JSON route on a workspace of 120 requirements (packages/cli/tests/parity/result-budget.test.ts).

A false pass would be a test that measures a result without the paging marker or diagnostics, so a cut that hides what it left out still reads as within budget, or a parity check that compares the routes before either is cut.