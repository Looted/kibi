---
title: A typed kb_query with an undeclared argument name or missing value returns no rows and names what exists
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:07:47.176Z'
id: SCEN-NEG-kibi-query-fact-filters-UNDECLARED-ARGUMENT
type: scenario
---
Given a KB with has_role and permission_rule facts, when kb_query asks permission_rule for an actor value no fact holds or asks has_role with an argument name the schema does not declare, then the answer has no rows, the factQuery block lists the values that exist and the next kb_query call to make, and a warning names the declared arguments.

This is the failure side of typed fact questions: a query outside the vocabulary must not return a silent empty answer. packages/cli/tests/consumer/query-fact-filters.test.ts "answers predicate, property and catalog questions and names the next call" exercises it.
