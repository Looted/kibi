---
title: A predicate fact with an undeclared argument constant is reported by predicate-schema-conformance
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:04:19.079Z'
id: SCEN-NEG-kibi-predicate-schema-conformance-UNDECLARED-CONSTANT
type: scenario
---
Given a KB holding a predicate fact whose argument value is not a declared constant of its schema, when kibi check runs predicate-schema-conformance, then the fact is reported as a non-blocking conformance warning with the undeclared_constant issue, and migration leaves it reported instead of repairing it automatically.

This is the failure side of schema conformance: an argument outside the closed vocabulary must surface in the check rather than pass silently. documentation/tests/e2e/packed/predicate-vocabulary-migration.test.ts "reports drift, migrates mechanical repairs under an approved hash, and rejects undeclared values" exercises it through FACT-POLICY-FATAL.
