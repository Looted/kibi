---
title: Loading kibi-usage returns the core arc and names its topic resources
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-16T16:00:00.000Z'
tags:
  - skills
id: SCEN-kibi-usage-core-arc
type: scenario
---
Given the bundled kibi-usage skill with a 3,400-character body, when an agent loads it through kb_skills or the CLI, then the body holds the interface choice and the five steps (search for prior intent, edit, record, check, commit) and names the resources that carry second-agent edits, the predicate decision tree, requirement size, domain subjects, hook snippets and quantified claims.

packages/cli/tests/skills-core-arc.test.ts asserts it on the bundled skill.