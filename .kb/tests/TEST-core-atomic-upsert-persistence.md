---
id: TEST-core-atomic-upsert-persistence
title: Atomic upsert, audit-lock, stale-snapshot, and process-reaping evidence
status: passing
created_at: 2026-08-11T00:00:00Z
updated_at: 2026-08-11T00:00:00Z
source: packages/cli/tests/prolog.test.ts
priority: must
tags:
  - core
  - cli
  - prolog
  - persistence
  - audit
  - concurrency
  - runtime
verification_scope: integration
verification_perspective: internal
links:
  - type: validates
    target: REQ-core-atomic-upsert-persistence
  - type: validates
    target: SCEN-core-atomic-upsert-persistence
---

The Prolog PLUnit suite verifies that `kb_commit_upsert/5` persists the entity, relationship, audit rows, and snapshot, classifies historical entities as updated, and remains writable after detach/reattach. Bun-path tests exercise the same commit against populated disposable KBs, hold `audit.log` with an old-style writer to prove bounded actionable failure before RDF mutation, and force a stage marker followed by an infinite goal to verify timeout stage reporting and cleanup. Node-path tests run the commit through the interactive process, serialize two current runtimes, reject a stale snapshot without durable partial state, and verify that later operations remain available after timeout termination.

Evidence commands:

```text
swipl -q -s packages/core/tests/kb.plt -g run_tests -t halt
bun test --timeout 15000 ./packages/cli/tests/prolog.test.ts ./packages/cli/tests/prolog.node.test.ts
```
