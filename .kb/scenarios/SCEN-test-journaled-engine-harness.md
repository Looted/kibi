---
id: SCEN-test-journaled-engine-harness
title: Fast isolated test execution through engine reuse
type: scenario
status: active
created_at: 2026-08-12T00:00:00Z
updated_at: 2026-08-12T00:00:00Z
source: test/root.test.ts
tags: [testing, engine, performance, isolation]
links:
  - type: verified_by
    target: TEST-test-journaled-engine-harness
---

Given integration and packed E2E tests exercise the journaled Kibi engine
When independent fixtures and package batches run concurrently
Then ordinary tests reuse processes and packed artifacts within explicit
isolation boundaries, command implementations load on demand, every test-owned
engine is durably stopped before fixture deletion, and summaries remain
deterministic.

Given a test specifically covers lifecycle or one-shot compatibility
When it creates a dedicated process
Then that process remains isolated and is cleaned up without affecting engines
owned by another fixture or a developer session.
