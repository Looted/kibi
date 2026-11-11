---
title: kibi migrate lists the implements comments left in tracked source
status: active
priority: must
tags:
  - migration
  - traceability
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer decision, 2026-11-11, to hard-drop inline implements comments; wording approved: "Ok"'
  recorded_at: '2026-11-11T05:47:31.224Z'
id: SCEN-migrate-inline-implements-review
type: scenario
---
Given a Git workspace whose tracked src/greet.ts starts with an `implements REQ-greet` comment above greet, when `kibi migrate --format json` prints the plan, then the plan has exactly one review_inline_implements_comment action naming src/greet.ts, line 1 and REQ-greet, and src/greet.ts is unchanged.

Given the same workspace after the comment is deleted, when the plan is printed again, then it has no such action.

This exists so that a repository which relied on comments learns which links to move into the manifest before the staged gate blocks it.