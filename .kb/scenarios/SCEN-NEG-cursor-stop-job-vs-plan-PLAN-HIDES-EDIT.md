---
title: A plan delivery does not silence the stop hook's impact check request when the same turn edited source
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:16:30.728Z'
id: SCEN-NEG-cursor-stop-job-vs-plan-PLAN-HIDES-EDIT
type: scenario
---
Given a Cursor conversation whose turn ran CreatePlan and then wrote src/app.ts, when the packed kibi-cursor stop hook runs, then the plan delivery does not excuse the edit: the hook still returns a follow-up that asks for an impact-enabled kb_check naming src/app.ts.

This is the failure side of the plan-delivery exemption: it covers plan-only turns and must not hide real source edits. documentation/tests/e2e/packed/cursor-plugin-launcher.test.ts "the packed stop hook still asks for an impact check when a plan turn also edited source" exercises it.
