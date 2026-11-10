---
title: The aggregate pull request gate refuses a change that edits the impact policy it is judged by
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T14:00:00.000Z'
id: SCEN-NEG-kibi-impact-aggregate-pr-gate-POLICY-WEAKENING
type: scenario
---
Given a trusted pull request snapshot whose candidate change edits `.kibi/impact-policy.json`, when the aggregate gate checks the change against the protected target, then it refuses with "Impact policy changes must be merged to the protected target separately before reviewed changes" instead of judging the change by the candidate's own policy.

This is the failure side of judging pull requests by the trusted target policy. packages/cli/tests/traceability/impact-pr-diff.test.ts "refuses a change that edits the impact policy" exercises it, and packages/cli/tests/traceability/trusted-pr-event.test.ts "rejects a PR targeting a branch outside the protected policy" covers the matching refusal of an untrusted target ref.
