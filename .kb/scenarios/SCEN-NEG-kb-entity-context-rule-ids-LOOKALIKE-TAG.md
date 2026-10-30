---
title: A look-alike review tag does not acknowledge missing body context
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T22:11:15.112Z'
id: SCEN-NEG-kb-entity-context-rule-ids-LOOKALIKE-TAG
type: scenario
---
Given a requirement without body context that is tagged review:missing-context and context-missing, when the schema 8 migration plans its context tags, then the requirement is not counted as already tagged and the plan adds review:context-missing to its tags.

This is the failure side of the reserved review tag: only the exact tag review:context-missing marks an acknowledged gap, so a near spelling must not stand in for it. packages/cli/tests/operations/migration/entity-body-context.test.ts "a look-alike review tag is not the context review tag" exercises it.
