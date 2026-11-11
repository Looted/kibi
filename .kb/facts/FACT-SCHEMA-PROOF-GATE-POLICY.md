---
id: FACT-SCHEMA-PROOF-GATE-POLICY
title: Proof gate policy predicate schema
status: active
tags:
  - lane:ontology
  - predicate-schema
fact_kind: predicate_schema
predicate_namespace: kibi.proof
predicate_name: proof_gate_policy
predicate_arity: 3
argument_names:
  - gate
  - condition
  - requirement
argument_types:
  - evidence_gate
  - gate_condition
  - gate_requirement
argument_descriptions:
  - Evidence status or gap the policy governs.
  - Condition under which the policy applies.
  - What must hold before the gate passes or the waiver counts.
examples:
  - "proof_gate_policy(tested_status,uncovered_rejection_case,needs_covering_scenario)"
type: fact
---

Grounds when a requirement may reach an evidence status and when a waiver counts.
