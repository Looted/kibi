---
title: An only-when clause compiles to a forbid rule with its exception and an untranslatable conditional stays an open gap
status: active
priority: must
tags:
  - modeling
  - semantic-advisor
  - compile-intent
  - conditional
  - rules
origin:
  kind: agent
  recorded_at: '2026-10-04T02:31:32.324Z'
id: SCEN-kibi-conditional-requirement-authoring
type: scenario
---
# An only-when clause compiles to a forbid rule with its exception and an untranslatable conditional stays an open gap

Given the prose "Checkout may happen only when the cart total is positive." or "Checkout must not happen unless the cart total is positive."
When the semantic advisor, `kb_compile_intent` or `kb_model` with `mode: "requirement"` reads it
Then each proposes the same `forbid` rule on checkout with the exception `cart total > 0`, linked through `requires_rule`.

Given the prose "Checkout may happen only when the cart total is positive and the user is verified."
When the same operations read it
Then the clause is an `ontology_gap` proposition with no observation and no strict property
And `kb_model` returns an `unresolved_conditional_clause` warning.

Given a `kb_model` observation below the confidence threshold
When it is proposed
Then it is tagged `review:ontology-gap` and carries no claim key.
