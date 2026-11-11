---
title: Packed end-to-end workers and the root suite run in bounded parallel batches with deterministic summaries and per-batch engine cleanup
status: open
semantic_text: Packed end-to-end workers MUST share an immutable installed package prefix and execute with bounded concurrency while retaining per-workspace engine isolation. The curated root suite MUST run package batches with bounded concurrency preserve deterministic summaries await all workers and clean test-owned engines after each batch.
semantic_clauses:
  - Packed end-to-end workers MUST share an immutable installed package prefix and execute with bounded concurrency while retaining per-workspace engine isolation
  - The curated root suite MUST run package batches with bounded concurrency preserve deterministic summaries await all workers and clean test-owned engines after each batch
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 565e6b08893db03553be4b1dd1245edb05aa671fcc3fc371db88dc4713c85e58
semantic_inventory:
  - claim_key: CLAIM-A1ABDF2E6AF7629A
    claim_text: Packed end-to-end workers MUST share an immutable installed package prefix and execute with bounded concurrency while retaining per-workspace engine isolation
    role: normative
    status: modeled
    span:
      start: 0
      end: 158
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-06A81A38F99959C8
    claim_text: The curated root suite MUST run package batches with bounded concurrency preserve deterministic summaries await all workers and clean test-owned engines after each batch
    role: normative
    status: modeled
    span:
      start: 160
      end: 329
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-A1ABDF2E6AF7629A
  - CLAIM-06A81A38F99959C8
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T10:00:32.189Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - testing
  - performance
  - isolation
id: REQ-test-bounded-suite-runners
type: req
---
Packed end-to-end workers MUST share an immutable installed package prefix and execute with bounded concurrency while retaining per-workspace engine isolation. The curated root suite MUST run package batches with bounded concurrency preserve deterministic summaries await all workers and clean test-owned engines after each batch.

## Context

Packed workers share one immutable install so parallel runs stay fast, and the root suite awaits every batch and stops its engines so a parallel run reports the same summary as a serial one.

Kibi's tests start many Prolog engines, so they must stay isolated and always be stopped, the suites must run in parallel without losing results, and the CLI must start fast without its registration drifting from the commands it runs.

## Why this changed

Split from REQ-test-journaled-engine-harness, which held three behaviors: engine isolation and cleanup in tests, bounded concurrency of the packed and root suite runners, and lazy loading of CLI commands. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
