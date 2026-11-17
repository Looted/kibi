---
title: Commit review guidance forbids hand edits of .kb and expects staging it
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-16T16:00:00.000Z'
tags:
  - skills
id: SCEN-kibi-commit-review-kb-staging
type: scenario
---
Given the bundled kibi-commit-review skill, when an agent loads it after a refused commit, then it reads that .kb files are not edited by hand and that staging .kb with git add is expected, and it reads the gate's evidence through kb_query and kb_check instead of opening .kb files.

packages/cli/tests/skills-core-arc.test.ts asserts it on the bundled skill.