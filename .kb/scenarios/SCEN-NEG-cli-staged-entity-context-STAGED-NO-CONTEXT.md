---
title: A staged entity document without body context is blocked by the staged check
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:03:10.533Z'
id: SCEN-NEG-cli-staged-entity-context-STAGED-NO-CONTEXT
type: scenario
---
Given a consumer workspace, when a commit stages a new entity document whose body lacks the context kibi check requires and kibi check --staged runs, then the check refuses the commit: it exits 1 with an entity-context-missing violation for that document.

This is the failure side of the staged entity context gate: an entity that says what but not why must not slip in through a commit. packages/cli/tests/consumer/staged-entity-context.test.ts "blocks a staged entity without body context and passes debt the commit did not introduce" exercises it.
