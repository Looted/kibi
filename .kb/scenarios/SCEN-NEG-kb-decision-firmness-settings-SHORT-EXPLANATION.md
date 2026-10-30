---
title: A supersede explained in fewer than 12 words is reported as missing its reason
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T22:11:07.225Z'
id: SCEN-NEG-kb-decision-firmness-settings-SHORT-EXPLANATION
type: scenario
---
Given three requirements that each supersede another, one explaining itself under Why this changed in eleven words, one in twelve words and one in twelve words under a Rationale heading, when the decision firmness rules evaluate them, then supersedes-reason-missing is reported for the eleven-word explanation and for the one under the other heading, and not for the twelve-word one.

This is the failure side of the minimum explanation length: a supersede explained in fewer than twelve words must not pass as explained. packages/cli/tests/public/decision-firmness.test.ts "an explanation under 12 words, or under another heading, does not count" exercises it.
