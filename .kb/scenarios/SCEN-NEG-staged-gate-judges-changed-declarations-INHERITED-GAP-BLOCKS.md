---
title: A gap the commit did not create does not block it
status: active
expects: rejection
tags:
  - negative-path
  - staged-gate
  - symbols
  - traceability
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
id: SCEN-NEG-staged-gate-judges-changed-declarations-INHERITED-GAP-BLOCKS
type: scenario
---
Given the same partially recorded file, a commit that adds a new unrecorded function is blocked naming only that function, never the untouched constant that was already unrecorded at the base commit.

documentation/tests/e2e/packed/staged-inherited-symbol-gaps.test.ts exercises it through the installed CLI.