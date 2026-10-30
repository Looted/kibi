---
title: A linked fact in a search answer without its typed claim or ask call is caught
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:57:45.720Z'
id: SCEN-CASE-kibi-query-fact-filters-FACT-WITHOUT-ASK
type: scenario
---
Given a requirement linked to a property fact, a predicate fact and a permission rule fact, when kb_search answers a question about it, then each linked fact carries its typed claim and the kb_query call that asks about it, and pasting that call returns the fact, so a fact answered without either is caught.

This covers one violating item past the invariant, `gt 0` on `linked_facts_without_typed_claim_or_ask_call`. packages/cli/tests/consumer/query-fact-filters.test.ts "answers predicate, property and catalog questions and names the next call" exercises it by asserting the claim and ask of each linked fact.
