---
title: 'A malformed legacy config blocks the migration and moves nothing'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-NEG-kibi-legacy-config-read-only-GUESSED-PATHS
type: scenario
---
Given a workspace whose legacy .kb/config.json is not valid JSON, when the packed CLI plans the migration, then it exits nonzero with a blocker saying the legacy config is malformed and default legacy paths will not be inferred, and the requirement file stays where it was.

This is the failure side of the legacy config rule. documentation/tests/e2e/packed/init-sync-check.test.ts, in its legacy config case, exercises it.
