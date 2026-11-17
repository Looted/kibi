---
title: A passing check gives its verdict on one line
status: active
expects: success
tags:
  - check
origin:
  kind: agent
  recorded_at: '2026-11-16T15:47:00.000Z'
id: SCEN-check-pass-one-line
type: scenario
---
Given a repository whose check passes with two unrecorded declarations, when kibi check runs, then its first line reads ✓ No violations. with the number of rules evaluated and "2 unrecorded declarations in 1 file do not block (kibi check --symbol-debt lists them).", and the kb_check result gives evaluated.ruleCount with no rule names because every default rule ran. A check that selects rules names the rules it ran.

documentation/tests/e2e/packed/check-symbol-debt.test.ts exercises it through the installed CLI.