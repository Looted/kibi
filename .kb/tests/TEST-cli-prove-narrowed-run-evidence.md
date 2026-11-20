---
title: Narrowed playwright run evidence tests
status: passing
priority: should
tags:
  - proof
  - cli
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-cli-prove-narrowed-run-evidence
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-20T16:10:45.446Z'
id: TEST-cli-prove-narrowed-run-evidence
type: test
---
The proof ingest operation tests (packages/cli/tests/operations-mutation/proof/ingest-proof.test.ts) ingest artifacts against a workspace whose integrations include a playwright integration `npx playwright test`. A run narrowed to the test's own spec, and a run narrowed to two tests' specs ingested together, each produce passing receipts that record the narrowed command. A run narrowed to another test's spec, or to a spec no ingested test names, is refused. The commandArgvAccepted cases cover the configured command (accepted without reading bindings), a command producer, a shorter or different prefix, a test with no spec files, and a test with a spec the run skipped.

A false pass would be a fixture whose narrowed command equals the configured one, since then the narrowed path is never taken.