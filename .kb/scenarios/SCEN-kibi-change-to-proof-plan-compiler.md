---
id: SCEN-kibi-change-to-proof-plan-compiler
title: Compile and apply a change-to-proof plan
status: active
created_at: 2026-08-13T00:00:00.000Z
updated_at: 2026-08-13T00:00:00.000Z
source: documentation/scenarios/SCEN-kibi-change-to-proof-plan-compiler.md
tags:
  - planning
  - requirements
  - contradiction
  - traceability
links:
  - type: verified_by
    target: TEST-kibi-change-to-proof-plan-compiler
  - type: verified_by
    target: TEST-e2e-plan-compiler-hash
type: scenario
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Given a requested product change, the agent reviews Kibi's proposition ledger and plan hash, resolves genuine ambiguity, and approves only evidence-backed mutations. Contradictory or ungrounded clauses remain visible as witnesses or abstentions; an apply request with a stale or mismatched hash is rejected.
