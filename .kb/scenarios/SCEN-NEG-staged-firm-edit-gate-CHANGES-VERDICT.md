---
title: A staged edit the agent judged as changing the rule stays blocked
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T06:59:51.421Z'
id: SCEN-NEG-staged-firm-edit-gate-CHANGES-VERDICT
type: scenario
---
Given a current receipt whose verdict is changes, when kibi check --staged runs on the edit, then it reports a blocking firm_edit_breaks_rule finding that asks the agent to supersede the requirement with the person's words or undo the edit. packages/cli/tests/public-mutation/impact/firm-edit-gate.mutation.test.ts exercises it.