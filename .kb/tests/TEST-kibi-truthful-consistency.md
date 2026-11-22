---
title: Consumer CLI reports exact strict-bound conflicts and incomplete contradiction analysis for unmodeled clauses
status: passing
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - contradictions
  - prolog
  - requirement-proof
  - truthful-consistency
  - e2e
id: TEST-kibi-truthful-consistency
type: test
priority: must
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-truthful-consistency
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-kibi-truthful-consistency
    target: default
    native_id: packages/cli/tests/consumer/truthful-consistency.test.ts::truthful consistency through the kibi CLI::reports incomplete analysis for unmodeled clauses and exact strict-bound conflicts
    source_file: packages/cli/tests/consumer/truthful-consistency.test.ts
    line: 29
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-03055af1ffddc16c0a0b7ebf
    test_id: TEST-kibi-truthful-consistency
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: e060aa82364e1c1b06165c283c6be7cc950de5f88d8f3dddfb0cbba51dade393
    binding_hash: 5afc3e4300709382a2b1875e35e36abd881406f05c753b3a295e416ff5d16ad4
    fingerprint: 7259acbf086de08b71f7b8bb412e9031c23a53f00de66dc986b576385f26be14
    fingerprint_components:
      contract: e060aa82364e1c1b06165c283c6be7cc950de5f88d8f3dddfb0cbba51dade393
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: d48d5c52546882d3fb0897297f7d80ac368f9580f231fca66f2cbf4b63d546ac
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-kibi-truthful-consistency
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
# Consumer CLI reports exact strict-bound conflicts and incomplete contradiction analysis for unmodeled clauses

In a fresh `kibi init` workspace, `packages/cli/tests/consumer/truthful-consistency.test.ts` authors a requirement whose numeric clause is grounded and whose review clause stays an ontology gap (ledger from `kibi semantic-advisor`), then drives the built CLI: `kibi coverage` reports the contradiction stage as `unresolved` / `analysis_incomplete` with `contradiction_check_incomplete`; after adding `remaining = 0` and `remaining >= 0` requirements, `kibi check --rules domain-contradictions` reports exactly the `gt 0 vs eq 0` pair and `kibi coverage` reports `conflict_found` only for the conflicting requirement.

The `kb_truthful_consistency` plunit unit in `packages/core/tests/kb.plt` covers interval entailment and rule-pair classification directly.
