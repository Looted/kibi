---
title: A state machine certificate over a table with an extra transition is rejected
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:14:06.546Z'
id: SCEN-CASE-kibi-non-numeric-proof-kinds-MACHINE-EXTRA-TRANSITION
type: scenario
---
Given the transitions set fact for invoice status and a state_machine certificate over a transition table that adds one transition the fact does not name (paid -> draft), when kibi prove re-reads the transition relation from the code, then the binding is rejected naming that transition and the receipt stays at tested instead of proved.

The test case "proves pattern, state machine and rule claims against the code's own model" in documentation/tests/e2e/packed/non-numeric-proof-kinds.test.ts exercises it through TEST-INVOICE-MACHINE-LEAKY in the packed CLI. It covers the value past the bound, `gt 0`, of machine projection members that differ from the set fact.