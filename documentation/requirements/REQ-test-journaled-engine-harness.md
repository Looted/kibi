---
id: REQ-test-journaled-engine-harness
title: Reuse and clean up journaled engines in tests
status: open
created_at: 2026-08-12T00:00:00Z
updated_at: 2026-08-12T00:00:00Z
source: test/root.test.ts
priority: must
tags:
  - testing
  - engine
  - performance
  - isolation
semantic_text: |-
  Test harnesses MUST assign spawned engines to private runtime directories and durably terminate every owned engine before deleting fixture state

  Ordinary integration tests MUST reuse long-lived engine or Prolog processes within an isolation boundary while lifecycle and compatibility tests MAY create dedicated processes

  Packed end-to-end workers MUST share an immutable installed package prefix and execute with bounded concurrency while retaining per-workspace engine isolation

  The curated root suite MUST run package batches with bounded concurrency preserve deterministic summaries await all workers and clean test-owned engines after each batch

  CLI startup MUST lazily load selected command implementations while lightweight registration metadata remains exactly equivalent to the authoritative operation catalog
semantic_clauses:
  - Test harnesses MUST assign spawned engines to private runtime directories and durably terminate every owned engine before deleting fixture state
  - Ordinary integration tests MUST reuse long-lived engine or Prolog processes within an isolation boundary while lifecycle and compatibility tests MAY create dedicated processes
  - Packed end-to-end workers MUST share an immutable installed package prefix and execute with bounded concurrency while retaining per-workspace engine isolation
  - The curated root suite MUST run package batches with bounded concurrency preserve deterministic summaries await all workers and clean test-owned engines after each batch
  - CLI startup MUST lazily load selected command implementations while lightweight registration metadata remains exactly equivalent to the authoritative operation catalog
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 3856143bd462b319aa8dbecc6113fea9e2738d6287ba8015be2f53f5a2ca378d
logic_claims:
  - CLAIM-E29FB93757B5BA4B
  - CLAIM-C17C22D2476F606C
  - CLAIM-A1ABDF2E6AF7629A
  - CLAIM-06A81A38F99959C8
  - CLAIM-86A9CDC403DEED58
semantic_inventory:
  - claim_key: CLAIM-E29FB93757B5BA4B
    claim_text: Test harnesses MUST assign spawned engines to private runtime directories and durably terminate every owned engine before deleting fixture state
    role: normative
    status: modeled
    span: {start: 0, end: 144}
  - claim_key: CLAIM-C17C22D2476F606C
    claim_text: Ordinary integration tests MUST reuse long-lived engine or Prolog processes within an isolation boundary while lifecycle and compatibility tests MAY create dedicated processes
    role: normative
    status: modeled
    span: {start: 146, end: 321}
  - claim_key: CLAIM-A1ABDF2E6AF7629A
    claim_text: Packed end-to-end workers MUST share an immutable installed package prefix and execute with bounded concurrency while retaining per-workspace engine isolation
    role: normative
    status: modeled
    span: {start: 323, end: 481}
  - claim_key: CLAIM-06A81A38F99959C8
    claim_text: The curated root suite MUST run package batches with bounded concurrency preserve deterministic summaries await all workers and clean test-owned engines after each batch
    role: normative
    status: modeled
    span: {start: 483, end: 652}
  - claim_key: CLAIM-86A9CDC403DEED58
    claim_text: CLI startup MUST lazily load selected command implementations while lightweight registration metadata remains exactly equivalent to the authoritative operation catalog
    role: normative
    status: modeled
    span: {start: 654, end: 821}
links:
  - type: specified_by
    target: SCEN-test-journaled-engine-harness
  - type: verified_by
    target: TEST-test-journaled-engine-harness
  - type: relates_to
    target: REQ-root-suite-batch-diagnostics
  - type: requires_predicate
    target: FACT-TEST-ENGINE-OWNED-TEARDOWN
  - type: requires_predicate
    target: FACT-TEST-ENGINE-PROCESS-REUSE
  - type: requires_predicate
    target: FACT-TEST-PACKED-SHARED-INSTALL
  - type: requires_predicate
    target: FACT-TEST-ROOT-BOUNDED-BATCHES
  - type: requires_predicate
    target: FACT-CLI-LAZY-OPERATION-LOAD
---

Test fixtures MUST isolate engine sockets and PID files in a private runtime
directory. Before fixture state is deleted, each owned daemon MUST receive a
graceful termination request that crosses the journal durability boundary;
stuck owned processes MAY be killed after a bounded wait.

Tests that verify ordinary behavior SHOULD reuse a long-lived engine or Prolog
process within their isolation boundary. Tests that specifically verify
startup, shutdown, crash recovery, one-shot compatibility, or branch isolation
MAY use dedicated processes.

Packed E2E workers MUST reuse a prepared immutable consumer installation while
retaining private repositories, homes, caches, and engine runtime directories.
Packed tests and root package batches MUST use bounded concurrency, await every
worker, and preserve deterministic summaries and cleanup.

CLI command registration MUST remain lightweight. The selected implementation
MUST be loaded only when invoked, and automated parity checks MUST prove that
the lightweight command metadata and lazy loader match the authoritative
18-operation catalog.
