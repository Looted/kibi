---
title: kb_upsert refuses a document.path inside a derived .kb tree
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T09:00:00.000Z'
id: SCEN-NEG-kibi-canonical-source-authoring-DERIVED-TREE-WRITE
type: scenario
---
Given an initialized project, when kibi upsert is asked to write a scenario with document.path under .kb/branches/main or .kb/migrations, then the command exits non-zero with SOURCE_PATH_INVALID naming derived state, and no file is written there. The same upsert with a path under the authored .kb/scenarios lane succeeds.

This is the failure side of canonical source authoring: derived runtime trees are never an authoring target. documentation/tests/e2e/packed/init-sync-check.test.ts "should refuse a document.path inside a derived .kb tree and write nothing there" exercises it, inside the TEST-cli-canonical-runtime proof run.
