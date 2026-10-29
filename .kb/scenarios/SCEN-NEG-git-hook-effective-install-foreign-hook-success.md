---
title: Init with a foreign pre-commit hook leaves it untouched and does not claim it was installed
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T20:53:32.769Z'
id: SCEN-NEG-git-hook-effective-install-foreign-hook-success
type: scenario
---
Given a repository whose pre-commit hook is a foreign script that Kibi does not manage, when `kibi init` runs, then it refuses to overwrite that hook, reports pre-commit as an existing non-Kibi hook left untouched, and no success line claims pre-commit was installed.

This is the failure side of per-hook installation reporting: an untouched foreign hook must never be announced as installed. packages/cli/tests/commands/init-git-context.test.ts "init reports skipped foreign hooks instead of unconditional success" exercises it.
