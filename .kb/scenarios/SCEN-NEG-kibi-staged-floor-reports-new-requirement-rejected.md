---
title: A changed requirement below its floor still blocks the commit
status: active
expects: rejection
text_ref: packages/cli/src/traceability/staged-evidence-floor.ts
tags:
  - negative-path
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T09:48:59.269Z'
id: SCEN-NEG-kibi-staged-floor-reports-new-requirement-rejected
type: scenario
---
Given a project at level test and a commit that raises the floor of a requirement already in the base, when kibi check --staged runs, then its evidence-floor finding blocks the commit: only a requirement the commit adds is reported instead of refused.
