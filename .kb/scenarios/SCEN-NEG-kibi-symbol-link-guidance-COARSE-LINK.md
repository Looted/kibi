---
title: A links-only upsert that links a symbol coarsely is refused when it is written
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:15:47.566Z'
id: SCEN-NEG-kibi-symbol-link-guidance-COARSE-LINK
type: scenario
---
Given a stored class symbol whose source file declares granular public methods, when kibi upsert sends a links-only update adding implements and covered_by to the class, then the dry run is an error envelope with UPSERT_DRY_RUN_INVALID and the write itself is refused with SYMBOL_GRANULARITY_VIOLATION, both naming the granular symbols to link instead.

This is the failure side of judging symbol links at write time: coarse link debt must not enter the KB to be caught later by the hook. packages/cli/tests/commands/symbol-link-guidance.test.ts "a coarse link is refused when it is written, an invalid dry run is an error, and symbol-coverage names the missing test link" exercises it.
