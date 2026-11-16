---
title: kb_query typed fact questions and the answer-layer fact claims are verified in Prolog and TypeScript
status: passing
priority: must
tags:
  - discovery
  - query
  - facts
  - search-lane
verification_scope: end_to_end
verification_perspective: consumer
text_ref: packages/cli/tests/consumer/query-fact-filters.test.ts; packages/core/tests/kb.plt; packages/cli/tests/operations/discovery.test.ts; packages/cli/tests/search-answer.test.ts
origin:
  kind: agent
  recorded_at: '2026-10-11T14:55:11.706Z'
id: TEST-kibi-query-fact-filters
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-query-fact-filters
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-99ce13a8f3ed2ff66798cac3
    test_id: TEST-kibi-query-fact-filters
    scope: end_to_end
    outcome: passed
    code_snapshot: f5912dc3fe126b68be0d7f2a26b4ef3d9aa6714b20db0c96de55004948d8c1d8
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T17:51:40.290Z'
    finished_at: '2026-11-16T17:51:55.635Z'
    artifact_digest: 7f8e7929cbb6b6ef384f73a60351d6e61f2273e4b2b4958ae5f8dfb09f3ba33c
    contract_hash: dba41c698273bb2c30a53e85b9021271ee09e72ee14eba865d8f939afac15302
    binding_hash: 7b13db9ca7a33dd562f9a452cc892e8932b8c1acef587afb49c4542f5054789e
    fingerprint: b1ceec02a264cd8d6d55c670f0c5dfdfa968e0c34894c3551c8b602daf1c477c
    fingerprint_components:
      contract: dba41c698273bb2c30a53e85b9021271ee09e72ee14eba865d8f939afac15302
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
      - symbol_id: SYM-test-kibi-query-fact-filters
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
# kb_query typed fact questions and the answer-layer fact claims are verified in Prolog and TypeScript

In a fresh `kibi init` workspace, `packages/cli/tests/consumer/query-fact-filters.test.ts` authors a roles-and-permissions model (a has_role schema, predicate facts, a subject and a property fact behind one requirement) and asks it through `kibi query` and `kibi search` on the built CLI: a named-argument count of alice's roles, an admin's rules with their effective decision, suggestions and warnings for a wrong value or argument name, the role limit by subject and property key, the predicate catalog, the unchanged exact lookup, and the search answer's typed fact claims and ask calls. Unit coverage runs the `discovery_ask` unit in `packages/core/tests/kb.plt` (positional and named predicate patterns, effective allow/deny decisions, current-requirement scope, distinct counts through the schema, unknown predicate and argument handling, suggestions when nothing matched, property queries, the schema catalog and fact-kind listings), the `kb_query asks predicate facts by name`, `kb_query routes property, catalog and fact-kind questions` and `kb_query rejects malformed typed fact questions` tests in `packages/cli/tests/operations/discovery.test.ts` (goal building from validated JSON, factQuery payload and next calls, input validation before any Prolog call), and `linked typed facts state their claim and the kb_query that asks about them` in `packages/cli/tests/search-answer.test.ts`.