---
title: A failing proof gate stops the KB merge workflow before the merge is pushed
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:59:58.052Z'
id: SCEN-NEG-ci-kb-merge-resolution-PUSH-AFTER-FAILED-GATE
type: scenario
---
Given a pull request branch with a committed merge and a Kibi store that the proof gate reports as not fresh, when the workflow's gate and push steps run in order, then scripts/proof-gate.sh exits non-zero, the push step never runs, and the remote branch keeps its previous commit.

This is the failure side of the proof-checked merge: a merge that fails the gate must be left for a person rather than pushed. scripts/tests/kb-merge-resolution.test.ts "a failing proof gate stops the job before the merge is pushed" exercises it, with a passing-gate control that does push.
