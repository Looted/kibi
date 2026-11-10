---
title: 'An upsert into .kb/branches or .kb/migrations is refused and writes nothing'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-NEG-kibi-kb-path-classes-DERIVED-WRITE
type: scenario
---
Given an initialized workspace, when the packed CLI upserts a scenario with document.path under .kb/branches/main or .kb/migrations, then it fails with SOURCE_PATH_INVALID naming Kibi's derived state and no file appears at that path.

This is the failure side of .kb path classes: the refusal depends on Kibi classifying .kb/branches and .kb/migrations as derived trees, so an unclassified path would be written. documentation/tests/e2e/packed/init-sync-check.test.ts, in its derived tree refusal case, exercises it.
