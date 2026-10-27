---
title: A maintainer proves pattern, state machine and rule claims against the code
status: active
priority: should
tags:
  - proof
  - certificate
origin:
  kind: agent
  recorded_at: '2026-10-26T09:46:20.912Z'
id: SCEN-kibi-non-numeric-proof-kinds
type: scenario
---
Given requirements whose claims the semantic advisor models as a string fact with operator matches ("Invoice numbers must match `INV-[0-9]{6}`") and as a transitions set fact ("Invoice status transitions must be one of draft -> sent, ..."), and a requirement model-requirement records as a kibi.logic.v1 rule ("Archived documents must never be shared"), when the maintainer runs kibi prove on regex, state_machine and rule tests whose proof contracts name those claims, then Kibi reads the pattern, the transition table and the sharing function from the code, and the tests over the anchored pattern, the transition table and a sharing function that never shares archived documents get derived claim bindings at evidence level proved. A pattern that also accepts longer strings is rejected with a string that tells the two languages apart, and a sharing function that lets owners share archived documents is rejected with the assignment that breaks the rule.