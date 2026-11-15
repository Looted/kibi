---
title: An agent's own unapproved verdict settles a pair with a must requirement
status: active
priority: must
expects: rejection
tags:
  - negative-path
  - contradictions
origin:
  kind: agent
  recorded_at: '2026-11-13T09:00:00.000Z'
id: SCEN-NEG-kb-unmodeled-pair-review-SELF-APPROVED
type: scenario
---
Given a pair that involves a must or firm requirement and a no_conflict verdict an agent recorded without origin.approved_by, when kibi check runs, then it must keep reporting the pair with a finding that asks for a person's approval, so the agent that wrote a requirement cannot clear its own gate.

packages/cli/tests/consumer/related-requirement-unmodeled.test.ts covers the unapproved and approved verdicts end to end.
