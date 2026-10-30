---
title: A requirement body without context is blocked by entity-context-missing even with a self-applied tag
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:00:49.034Z'
id: SCEN-NEG-kb-entity-body-context-thin-body
type: scenario
---
Given a workspace with a current requirement whose body is only its statement, and another that applies the review:context-missing tag to itself, when `kibi check` runs the entity-context-missing rule, then both are reported as violations and the check fails, while a requirement with real context passes.

This is the failure side of the body context check: a thin body must not pass quietly, and a tag the migration did not record must not silence it. packages/cli/tests/commands/check-entity-context.test.ts "blocks a thin entity and a self-applied tag, accepts context, and counts migration-acknowledged entities" exercises it.
