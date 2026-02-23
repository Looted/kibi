---
id: TEST-010
title: Inference MCP tools return deterministic impact and coverage outputs
status: active
created_at: 2026-02-20T08:10:00.000Z
updated_at: 2026-02-20T08:10:00.000Z
priority: must
tags:
  - mcp
  - inference
  - integration
links:
  - REQ-013
  - SCEN-008
  - ADR-008
---

Validation steps:
1. Seed a KB with requirements, tests, symbols, and ADR constraints.
2. Run `kb_derive` for each Phase 1 rule and verify row structure and ordering.
3. Run `kb_impact` for a changed requirement and verify typed impacted entities.
4. Run `kb_coverage_report` with and without type filter and verify aggregate fields.
5. Confirm outputs are machine-parseable and deterministic for repeated calls.
