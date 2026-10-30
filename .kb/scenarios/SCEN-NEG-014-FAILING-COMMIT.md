---
title: The pre-commit hook refuses a commit whose staged KB fails kibi check
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:05:52.713Z'
id: SCEN-NEG-014-FAILING-COMMIT
type: scenario
---
Given a repository initialized with the Kibi hooks and a staged scenario that links a test which does not exist, when the user runs git commit, then the pre-commit hook runs the staged kibi check, reports the missing relationship endpoint and the commit is not created.

This is the failure side of the enforcement gate: a knowledge base that fails kibi check must not be committed. documentation/tests/e2e/packed/hook-integration.test.ts "should block a commit whose staged KB fails kibi check" exercises it with the packed CLI and real git hooks.
