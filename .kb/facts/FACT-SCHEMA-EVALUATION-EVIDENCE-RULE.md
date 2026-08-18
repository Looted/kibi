---
id: FACT-SCHEMA-EVALUATION-EVIDENCE-RULE
title: Evaluation evidence rule predicate schema
status: active
created_at: 2026-08-04T00:00:00Z
updated_at: 2026-08-04T00:00:00Z
source: documentation/facts/FACT-SCHEMA-EVALUATION-EVIDENCE-RULE.md
fact_kind: predicate_schema
predicate_namespace: kibi.skillopt
predicate_name: evaluation_evidence_rule
predicate_arity: 3
argument_names: [component, condition, outcome]
argument_types: [evaluation_component, failure_or_input_condition, required_evidence_outcome]
argument_descriptions:
  - Skillopt component whose evidence or behavior is governed.
  - Input or failure condition under which the rule applies.
  - Canonical outcome required for faithful evaluation or feedback.
examples:
  - evaluation_evidence_rule(paid_optimization,provider_quota_exhaustion,budget_exhausted_infrastructure_abort)
tags: [lane:ontology, predicate-schema, skillopt, evaluation]
---

Defines the project-local ontology for Skillopt evidence fidelity. This schema is intentionally narrower than generic state, retention, or preservation predicates.
