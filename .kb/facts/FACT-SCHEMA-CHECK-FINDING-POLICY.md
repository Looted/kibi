---
title: Check finding policy
status: active
fact_kind: predicate_schema
predicate_name: check_finding_policy
predicate_namespace: kibi.checks
predicate_arity: 3
argument_names:
  - rule
  - finding
  - severity
argument_types:
  - check_rule
  - finding_class
  - diagnostic_severity
argument_descriptions:
  - Named kb_check rule.
  - Class of finding the rule reports.
  - 'Non-blocking diagnostic severity: warning or info.'
examples:
  - check_finding_policy(domain_redundancy,identical_ground_term,warning)
tags:
  - ontology
  - vocabulary-convergence
id: FACT-SCHEMA-CHECK-FINDING-POLICY
type: fact
---
