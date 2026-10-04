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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-e5484935fb2e4803ff1b1927
    test_id: TEST-kibi-truthful-consistency
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: e060aa82364e1c1b06165c283c6be7cc950de5f88d8f3dddfb0cbba51dade393
    binding_hash: e3d69815725f0f1900d126c9f6d6fce9c64280de945d524ecb09d8b82d26d155
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
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
# Consumer CLI reports exact strict-bound conflicts and incomplete contradiction analysis for unmodeled clauses

In a fresh `kibi init` workspace, `packages/cli/tests/consumer/truthful-consistency.test.ts` authors a requirement whose numeric clause is grounded and whose review clause stays an ontology gap (ledger from `kibi semantic-advisor`), then drives the built CLI: `kibi coverage` reports the contradiction stage as `unresolved` / `analysis_incomplete` with `contradiction_check_incomplete`; after adding `remaining = 0` and `remaining >= 0` requirements, `kibi check --rules domain-contradictions` reports exactly the `gt 0 vs eq 0` pair and `kibi coverage` reports `conflict_found` only for the conflicting requirement.

The `kb_truthful_consistency` plunit unit in `packages/core/tests/kb.plt` covers interval entailment and rule-pair classification directly.
