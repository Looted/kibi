---
title: Hash-bound bootstrap planning and shared apply recovery
status: accepted
id: ADR-KIBI-BOOTSTRAP-PLAN-APPLY
type: adr
---
# Decision

Kibi onboarding uses one shared planner and one journaled plan/apply runtime. Public adapters only route host capabilities and typed status to the canonical skill. The planner returns an exact hash-bound plan; application accepts only that unchanged approved plan, checkpoints each action, and exposes typed repair and recovery state.
