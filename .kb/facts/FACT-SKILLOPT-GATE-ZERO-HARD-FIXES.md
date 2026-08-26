---
title: Three harness defects pinned every train rollout to hard=0
status: closed
tags:
  - skillopt
  - review:diagnostics
fact_kind: observation
id: FACT-SKILLOPT-GATE-ZERO-HARD-FIXES
type: fact
---
---
id: FACT-SKILLOPT-GATE-ZERO-HARD-FIXES
fact_kind: observation
title: Three harness defects pinned every train rollout to hard=0
status: closed
---

Telemetry from the 2026-08-25 paid suite showed 0 accepts across all skills with identical failure categories on 100% of train trajectories. Root causes: (1) the trust-plane scanner classified brokered MCP tool-call arguments/results containing .kb-relative plan paths as direct_kb_access security failures — kb_apply_plan payloads legitimately embed such paths, so approval-phase cells could never pass; (2) the evaluator could only emit taskOutcome complete|blocked, making interim (pre-approval) objectives unsatisfiable; (3) interim objectives also asserted a critical state://…/complete flag that read-only planning can never produce. Fixes: MCP items are now exempt from filesystem scans (hidden-marker scan still global), workflowOutcome emits interim when expectations require it and no write tools were brokered, and interim objectives replace the base complete assertion with a non-critical placeholder.
