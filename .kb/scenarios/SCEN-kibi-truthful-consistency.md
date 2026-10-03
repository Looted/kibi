---
title: Exact numeric and rule conflict decisions with incomplete analysis for unmodeled clauses
status: active
priority: must
tags:
  - contradictions
  - prolog
  - requirement-proof
  - truthful-consistency
id: SCEN-kibi-truthful-consistency
type: scenario
---
# Exact numeric and rule conflict decisions with incomplete analysis for unmodeled clauses

Given current requirements that constrain the same subject with `total > 0` and `total = 0`, or `<= 0` and `> 0`
When kb_check runs domain-contradictions
Then the pair is reported as a contradiction, including strict bounds.

Given two typed rules over the same predicate
When their bodies are compared
Then the pair is classified as contradiction, disjoint, or unresolved, and unresolved overlap is never reported as no conflict.

Given a requirement with propositions that are not modeled
When the proof ladder evaluates its contradiction stage
Then the stage reports analysis_incomplete / unresolved instead of no conflict found.
