---
title: A staged edit of firm code without a review is blocked
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T06:59:50.352Z'
id: SCEN-NEG-staged-firm-edit-gate-UNREVIEWED
type: scenario
---
Given a staged edit inside a symbol that implements a current firm requirement and no current keeps receipt for it, when kibi check --staged runs, then it reports a blocking firm_edit_unreviewed finding naming the requirement and symbol, and the commit is refused. packages/cli/tests/public-mutation/impact/firm-edit-gate.mutation.test.ts exercises it.