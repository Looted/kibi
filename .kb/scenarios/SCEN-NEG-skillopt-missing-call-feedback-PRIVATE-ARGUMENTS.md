---
title: A cell that misses a call with private arguments records only the tool name and position
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T10:45:00.000Z'
id: SCEN-NEG-skillopt-missing-call-feedback-PRIVATE-ARGUMENTS
type: scenario
---
Given a required call whose argument predicate names a private path, when the cell's evidence makes the call with other arguments and the scorer records the first missing required call, then the record names only the tool and its position and carries no private argument, and the public feedback written for the next revision contains no task identifier, episode or scorer content.

This is the failure side of missing-call feedback: private evaluator content never reaches the optimizer through a protocol failure. documentation/tests/e2e/skillopt-host-neutral-optimization.e2e.ts, in its first part where public-feedback.json is checked for leaks and its second part where an argument miss is scored, exercises it.
