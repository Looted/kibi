---
id: TEST-test-journaled-engine-harness
title: Journaled engine test reuse, isolation, and cleanup suite
status: active
created_at: 2026-08-12T00:00:00Z
updated_at: 2026-08-12T00:00:00Z
source: packages/cli/tests/engine.test.ts
priority: must
tags: [testing, engine, cli, e2e]
links:
  - type: validates
    target: SCEN-test-journaled-engine-harness
  - type: validates
    target: REQ-test-journaled-engine-harness
---

The harness tests verify graceful signal-driven journal flush and replay,
shared interactive Prolog fixtures for ordinary behavior, exact CLI metadata
and lazy-loader parity, bounded root-suite concurrency and deterministic
summaries, shared packed installation setup, private engine runtime ownership,
and teardown before fixture deletion.

The full curated unit and packed E2E suites provide the integration evidence:
they must complete without leaked test-owned engines, isolation failures, or
contract drift across CLI and MCP surfaces.
