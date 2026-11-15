---
title: An agent checks its changed files on a large KB and gets the findings that concern the change
status: active
priority: must
expects: success
tags:
  - check
  - impact
origin:
  kind: agent
  recorded_at: '2026-11-15T18:42:12.900Z'
id: SCEN-kibi-scoped-check-output
type: scenario
---
Given a knowledge base with many blocking violations, most of them on entities the change does not touch, when an agent runs kb_check with the files it changed as sourceFiles, then the result lists the blocking violations on the entities those files' symbols link to, on the KB documents it changed, on their relationships and files, and from store-level rules; it counts the others by rule and includes them in its count, summarises the migration plan, and stays within 24,000 characters while naming every blocking rule.