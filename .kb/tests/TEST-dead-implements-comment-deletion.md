---
title: An edit that only deletes dead implements comments is not put to the person
status: passing
priority: must
tags:
  - unit
verification_scope: unit
origin:
  kind: agent
  ref: 'Maintainer request, 2026-11-12, after the review of release 2026.11.2 reported the findings: "Well, can you make a PR with a hotfix then?" and "Yes, do all post review work in the hotfix."'
  recorded_at: '2026-11-12T13:31:04.832Z'
id: TEST-dead-implements-comment-deletion
type: test
---
`packages/agent-core/tests/decision-guard.test.ts` asserts which lines count as a dead implements comment and that an edit, a list of edits and a whole-file write are recognised only when every removed line is such a comment and nothing else changes. `packages/claude/tests/hook-runner.test.ts` asserts that the Claude hook does not ask for a comment-only deletion in a file a firm requirement governs and still asks when the same edit also changes code. It would pass falsely if the file were not governed by a firm requirement, so the second case uses the same file.
