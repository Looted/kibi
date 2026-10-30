---
title: A rule certificate over code that breaks the rule for one assignment is rejected
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:01:30.822Z'
id: SCEN-CASE-kibi-non-numeric-proof-kinds-RULE-ASSIGNMENT-VIOLATED
type: scenario
---
Given the rule "Archived documents must never be shared" and a rule certificate over a sharing function that lets an owner share an archived document, so exactly one assignment of the rule's variables (archived, owner) breaks it, when kibi prove re-evaluates the code's predicate tables over the finite domains it reads, then the binding is rejected with that assignment named (the code decides can_share(archived, owner) is true, but the rule requires false) and the rule is not proved by that test.

The test case "proves pattern, state machine and rule claims against the code's own model" in documentation/tests/e2e/packed/non-numeric-proof-kinds.test.ts exercises it through TEST-SHARING-LEAKY in the packed CLI. It covers the value past the bound, `gt 0`, of rule assignments violated.