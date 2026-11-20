---
title: kibi prove ingest refusal tests
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
    - symbol_id: SYM-test-cli-prove-ingest-refusal-reported
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-20T16:10:51.474Z'
id: TEST-cli-prove-ingest-refusal-reported
type: test
---
The prove ingest refusal tests in packages/cli/tests/commands/prove-mutation.test.ts run proveCommand with an ingest seam that refuses chosen calls with "Proof ingest failed:". A refused playwright integration is listed in failures while the command integration's run is reported and recorded as ingested; a refused partition of a command run keeps the receipts of the partition before it and records no progress; an engine error that is not a refusal still rejects the command. isIngestRefusal is checked against a refusal, another error and a non-error value.

A false pass would be a seam that refuses every call, since then the other integration's summary is never exercised.