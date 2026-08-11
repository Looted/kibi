---
id: SCEN-kibi-dependency-ordered-repair-plan
title: Inspect complete and paginated requirement repair plans
status: active
created_at: 2026-08-10T00:00:00Z
updated_at: 2026-08-10T00:00:00Z
source: documentation/scenarios/SCEN-kibi-dependency-ordered-repair-plan.md
tags: [requirements, proof, repair, pagination, packed, e2e]
links:
  - type: verified_by
    target: TEST-kibi-dependency-ordered-repair-plan
---

Given multiple requirements with proof gaps, when a packed consumer requests requirement coverage, then Kibi returns a stable read-only repair plan whose same-requirement phases are dependency ordered, only the earliest phase is ready, and every later phase is blocked by explicit batch IDs. When pagination omits an actionable requirement, the plan is partial with an excluded count. Symbol/type coverage omits requirement plans, and repeated coverage reads leave the KB snapshot unchanged.
