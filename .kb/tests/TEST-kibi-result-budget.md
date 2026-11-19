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
    receipt_id: PR-3af7f3e49964fa86e40ea003
    test_id: TEST-kibi-result-budget
    scope: end_to_end
    outcome: passed
    code_snapshot: 124d452d979c4b2d1c6c7420b3eeb54c5cff6f5364670bb741a45c62f81bf5da
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-19T15:39:00.454Z'
    finished_at: '2026-11-19T15:39:14.461Z'
    artifact_digest: 2bb9b8ae08c50e0c0dd756a5ac4cde2040e45acf5f6217c75228a471d7a7fa89
    contract_hash: a3dedc0d60abd765bedb477b083e9744ba3e819094e8e0a0e4d0e74e2751c806
    binding_hash: 29d02bba2cc6484cc9296cc8ca5ec7c2a3ca70d343f1c924ef924e83d0366325
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