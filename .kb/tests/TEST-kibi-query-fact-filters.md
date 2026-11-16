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
    receipt_id: PR-8be80646cf312986d8e49de7
    test_id: TEST-kibi-query-fact-filters
    scope: end_to_end
    outcome: passed
    code_snapshot: 1c9b0c94e9514e1bd4b304f4a0a96dc0c62e02640994c50b0b2286f5f8a86582
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T16:47:43.156Z'
    finished_at: '2026-11-16T16:47:54.467Z'
    artifact_digest: 05308762f0066569d770bfe3dce171d6d4d82c7fda4ae9bd0e077634c35bd255
    contract_hash: dba41c698273bb2c30a53e85b9021271ee09e72ee14eba865d8f939afac15302
    binding_hash: 637dbaafe46512beae89017cd2c5e66d078d23c28ff618cc51459524b01d66aa
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