---
title: A comment-only deletion is not answered with a confirmation request
status: active
expects: rejection
priority: must
tags:
  - negative-path
origin:
  kind: agent
  ref: 'Maintainer request, 2026-11-12, after the review of release 2026.11.2 reported the findings: "Well, can you make a PR with a hotfix then?" and "Yes, do all post review work in the hotfix."; wording approved by the maintainer, 2026-11-12: "Approve"'
  approved_by: maintainer
  recorded_at: '2026-11-12T14:32:13.313Z'
id: SCEN-NEG-dead-implements-comment-deletion-confirmed
type: scenario
---
Given a source file whose symbol implements a firm requirement and that carries an inline `// implements REQ-...` comment, when an edit removes only that comment line, then the shipped hook does not return the `ask` permission decision it returns for a code change in the same place.

This is the failure side of the exemption: a hook that still asked would stall the cleanup `kibi migrate` requests. `packages/claude/tests/dead-implements-comment-consumer.test.ts` runs the shipped bundle for both edits.
