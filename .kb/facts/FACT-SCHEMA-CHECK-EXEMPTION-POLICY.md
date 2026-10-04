---
title: Check exemption policy
status: active
fact_kind: predicate_schema
predicate_name: check_exemption_policy
predicate_namespace: kibi.checks
predicate_arity: 2
argument_names:
  - rule
  - exemption
argument_types:
  - check_rule
  - exemption_class
argument_descriptions:
  - Named kb_check rule.
  - Situation the rule deliberately does not report.
examples:
  - check_exemption_policy(domain_redundancy,restates_link)
tags:
  - ontology
  - vocabulary-convergence
id: FACT-SCHEMA-CHECK-EXEMPTION-POLICY
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
