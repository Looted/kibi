---
title: A kibi check run that finds violations exits non-zero and names the violated rule
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T20:56:30.998Z'
id: SCEN-NEG-cli-check-VIOLATIONS-EXIT-ZERO
type: scenario
---
Given a branch KB with a must-priority requirement that no scenario covers, when kibi check runs over it, then the command does not exit 0: it exits with code 1 and its output names the must-priority-coverage rule and the missing scenario coverage.

This is the failure side of check exit status: a failing check that exits 0 would let a pre-commit hook or CI step pass a broken KB. packages/cli/tests/commands/check.test.ts "detects must-priority requirement without scenario" exercises it.
