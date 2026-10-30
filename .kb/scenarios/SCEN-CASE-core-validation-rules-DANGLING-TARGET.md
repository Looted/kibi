---
title: A relationship whose target is missing from the KB fails kibi check as a hard violation
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:56:42.121Z'
id: SCEN-CASE-core-validation-rules-DANGLING-TARGET
type: scenario
---
Given a freshly initialized packed workspace with a scenario whose verified_by link targets a test that does not exist, when kibi check runs after sync, then it exits non-zero and reports the scenario as a hard violation, not as a quality diagnostic.

This covers the edge case of one dangling relationship target, the value past the bound `gt 0`. documentation/tests/e2e/packed/cli-workflows.test.ts "keeps an objectively invalid relationship in the hard violations lane" exercises it.
