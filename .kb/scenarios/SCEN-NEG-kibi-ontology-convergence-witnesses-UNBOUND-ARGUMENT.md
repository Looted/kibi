---
title: A predicate suggestion with unbound arguments yields no applicable plan
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:02:41.420Z'
id: SCEN-NEG-kibi-ontology-convergence-witnesses-UNBOUND-ARGUMENT
type: scenario
---
Given a project-local predicate schema with subject, condition and outcome arguments and requirement prose that binds only the subject, when kibi suggest-predicates runs, then the schema is ranked first but the recommended action is to provide argument bindings, the apply plan is empty, and the condition and outcome arguments are reported as unbound.

This is the failure side of conservative predicate convergence: a guessed binding must not become a write. documentation/tests/e2e/packed/ontology-convergence-witnesses.test.ts "discovers packed project schemas, withholds incomplete plans, and returns exact contradiction evidence" exercises it.
