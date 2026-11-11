---
title: Hash-bound bootstrap planning and shared apply recovery
status: accepted
id: ADR-KIBI-BOOTSTRAP-PLAN-APPLY
type: adr
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-10, approving the supersession reasons recovered from history in the KB gold-standard review (reasons batch 1): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---
# Decision

Kibi onboarding uses one shared planner and one journaled plan/apply runtime. Public adapters only route host capabilities and typed status to the canonical skill. The planner returns an exact hash-bound plan; application accepts only that unchanged approved plan, checkpoints each action, and exposes typed repair and recovery state.

## Why this changed
The onboarding autopilot was replaced by one shared planner and a journaled plan/apply runtime. Hosts now only route capabilities to the canonical skill, instead of each adapter deciding. Source: commit "replace onboarding autopilot with bootstrap plan apply", Aug 20.
