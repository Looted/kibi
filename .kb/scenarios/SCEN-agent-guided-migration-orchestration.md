---
id: SCEN-agent-guided-migration-orchestration
title: Agent previews and safely applies a migration plan
status: active
created_at: 2026-08-14T00:00:00Z
updated_at: 2026-08-14T00:00:00Z
source: documentation/requirements/REQ-agent-guided-migration-orchestration.md
priority: must
tags:
  - migration
  - agents
  - recovery
links:
  - type: relates_to
    target: REQ-core-journaled-engine-persistence
  - type: relates_to
    target: REQ-011
  - type: verified_by
    target: TEST-agent-guided-migration-orchestration
---

**Scenario: deterministic automatic repair**

Given a branch with a missing or legacy schema/store condition, when an agent
requests status and a migration preview, then Kibi returns a hashed
`kibi.migration-plan.v2` with ready automatic actions, exact dependencies, and
pre/postconditions without starting a write-capable engine.

**Scenario: approved application and readback**

Given an unchanged plan hash and an explicit set of ready automatic action IDs,
when the agent invokes `kb_apply_plan` or `kibi migrate --apply-safe`, then Kibi
applies actions in dependency order, preserves recovery evidence, rejects review
or blocked actions, and returns the remaining plan after status/check/coverage
readback.

**Scenario: semantic boundary**

Given ontology gaps, contradictions, stale receipts, package drift, or authored
symbol ambiguity, when the plan is assembled, then those items remain typed
review/operator/execution actions and are never auto-applied or treated as proof.
