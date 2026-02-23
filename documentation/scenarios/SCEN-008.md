---
id: SCEN-008
title: Agent derives impact and coverage from a requirement change
status: active
created_at: 2026-02-20T08:10:00.000Z
updated_at: 2026-02-20T08:10:00.000Z
priority: must
tags:
  - inference
  - impact
  - coverage
links:
  - REQ-013
  - ADR-008
---

Steps:
1. Agent calls `kb_impact` with a changed requirement ID.
2. Kibi returns impacted entities with stable ordering and explicit types.
3. Agent calls `kb_coverage_report` to inspect requirement/symbol gaps.
4. If needed, agent calls `kb_derive` for specific predicates (e.g. `coverage_gap`).
5. Agent uses deterministic structured results to plan code and test updates.
