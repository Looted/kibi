---
title: Bootstrap on a seeded repository hands off instead of planning a new seed
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T05:00:00.000Z'
id: SCEN-NEG-kibi-bootstrap-seed-and-handoff-SEEDED-REPLAN
type: scenario
---
Given a repository whose knowledge base is already seeded, when an agent asks plan-bootstrap for a plan, then the plan status is handoff with activation mode attached_seeded_handoff, and the handoff message names kb_compile_intent as the path for new claims. An uninitialized root is blocked from apply.

This is the failure side of seeding then handing off: a seeded repository must not be bootstrapped again. packages/cli/tests/operations/bootstrap.test.ts "returns blocked and handoff plan statuses for uninitialized and seeded roots" exercises it, inside the TEST-KIBI-BOOTSTRAP-PLAN-APPLY proof run.
