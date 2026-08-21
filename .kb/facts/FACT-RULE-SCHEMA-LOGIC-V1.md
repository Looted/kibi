---
title: kibi.logic.v1 rule schema
status: active
fact_kind: rule_schema
rule_name: kibi.logic.v1
argument_names:
  - rule_ir
argument_types:
  - logic_ir
aliases:
  - conditional rule
  - constraint
  - policy rule
examples:
  - forbid(recommend_predicate(V1)) :- arguments_populated(V1), semantically_unrelated(V1).
id: FACT-RULE-SCHEMA-LOGIC-V1
type: fact
---
