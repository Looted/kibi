---
title: Test harnesses give each spawned engine a private runtime directory, reuse engines within an isolation boundary, and stop every owned engine
status: open
semantic_text: Test harnesses MUST assign spawned engines to private runtime directories and durably terminate every owned engine before deleting fixture state. Ordinary integration tests MUST reuse long-lived engine or Prolog processes within an isolation boundary while lifecycle and compatibility tests MAY create dedicated processes.
semantic_clauses:
  - Test harnesses MUST assign spawned engines to private runtime directories and durably terminate every owned engine before deleting fixture state
  - Ordinary integration tests MUST reuse long-lived engine or Prolog processes within an isolation boundary while lifecycle and compatibility tests MAY create dedicated processes
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 97057c25660232dbad77e595113cf650f4d5b98aaa284945c2180fcca6dd4d77
semantic_inventory:
  - claim_key: CLAIM-E29FB93757B5BA4B
    claim_text: Test harnesses MUST assign spawned engines to private runtime directories and durably terminate every owned engine before deleting fixture state
    role: normative
    status: modeled
    span:
      start: 0
      end: 144
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-C17C22D2476F606C
    claim_text: Ordinary integration tests MUST reuse long-lived engine or Prolog processes within an isolation boundary while lifecycle and compatibility tests MAY create dedicated processes
    role: normative
    status: modeled
    span:
      start: 146
      end: 321
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-E29FB93757B5BA4B
  - CLAIM-C17C22D2476F606C
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T10:00:28.377Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - testing
  - engine
  - isolation
id: REQ-test-engine-isolation-and-cleanup
type: req
---
Test harnesses MUST assign spawned engines to private runtime directories and durably terminate every owned engine before deleting fixture state. Ordinary integration tests MUST reuse long-lived engine or Prolog processes within an isolation boundary while lifecycle and compatibility tests MAY create dedicated processes.

## Context

A test engine that outlives its harness keeps fixture state alive and leaks into later tests, so each one runs in a private runtime directory and is killed by PID before that state is deleted.

Kibi's tests start many Prolog engines, so they must stay isolated and always be stopped, the suites must run in parallel without losing results, and the CLI must start fast without its registration drifting from the commands it runs.

## Why this changed

Split from REQ-test-journaled-engine-harness, which held three behaviors: engine isolation and cleanup in tests, bounded concurrency of the packed and root suite runners, and lazy loading of CLI commands. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
