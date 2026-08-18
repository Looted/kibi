---
id: SCEN-kibi-change-to-proof-plan-compiler
title: Compile and apply a change-to-proof plan
status: active
created_at: 2026-08-13T00:00:00Z
updated_at: 2026-08-13T00:00:00Z
source: documentation/scenarios/SCEN-kibi-change-to-proof-plan-compiler.md
tags: [planning, requirements, contradiction, traceability]
links:
  - type: verified_by
    target: TEST-kibi-change-to-proof-plan-compiler
---

Given a requested product change, the agent reviews Kibi's proposition ledger and plan hash, resolves genuine ambiguity, and approves only evidence-backed mutations. Contradictory or ungrounded clauses remain visible as witnesses or abstentions; an apply request with a stale or mismatched hash is rejected.
