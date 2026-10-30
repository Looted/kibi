---
title: 'A field both sides changed differently is not merged silently: the driver leaves markers and exits non-zero'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T20:58:59.368Z'
id: SCEN-NEG-cli-kb-merge-driver-SILENT-CONFLICT
type: scenario
---
Given a symbols manifest whose record SYM-a has status active on one side and status deprecated on the other, when kibi merge-driver merges the base, current and other versions, then it refuses to pick a side: it exits with code 1, names the field both sides changed on stderr, and leaves conflict markers in the current file.

This is the failure side of manifest merging: a real conflict resolved without telling anyone would lose one side's decision. packages/cli/tests/commands/merge-driver.test.ts "leaves conflict markers and exits non-zero on a real conflict" exercises it.
