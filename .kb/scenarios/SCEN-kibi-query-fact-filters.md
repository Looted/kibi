---
title: An agent asks kb_query a typed question about modeled facts
status: active
priority: must
tags:
  - discovery
  - query
  - facts
  - search-lane
origin:
  kind: agent
  recorded_at: '2026-10-11T14:55:11.069Z'
id: SCEN-kibi-query-fact-filters
type: scenario
---
# An agent asks kb_query a typed question about modeled facts

Given a KB with predicate facts, a predicate schema with argument names, strict property facts and a built-in decision predicate
When an agent calls kb_query with a predicate name and named where arguments, with a subject key and property key, or with a fact kind
Then the answer lists the matching fact rows with their typed fields and a factQuery block naming the schema, distinct counts, existing values when nothing matched, warnings for undeclared argument names and the next call to make
And an unknown predicate or argument returns no rows and no fabricated result
And the kb_search answer layer shows each linked typed fact's claim and the kb_query call that asks about it