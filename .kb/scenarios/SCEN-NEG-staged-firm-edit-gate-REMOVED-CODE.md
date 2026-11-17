---
title: Removing firm code or editing a firm constant without a review is blocked
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T21:07:45.777Z'
id: SCEN-NEG-staged-firm-edit-gate-REMOVED-CODE
type: scenario
---
Given a constant or an arrow function that implements a current firm requirement, when a commit changes its value, removes lines from inside a firm function, or removes the firm function together with its symbol record, then kibi check --staged reports a blocking firm_edit_unreviewed finding naming the requirement and the symbol (marked removed for a removed symbol) until a current keeps receipt covers it. A note added to the requirement's document in the same commit does not lift the block; a new statement, a new status or a superseding requirement in the commit does. packages/cli/tests/public-mutation/impact/firm-edit-gate.mutation.test.ts and packages/cli/tests/consumer/firm-edit-review.test.ts exercise it.