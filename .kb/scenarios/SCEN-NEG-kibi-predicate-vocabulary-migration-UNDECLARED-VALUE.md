---
title: Migration plans no automatic repair for a predicate fact with an undeclared argument value
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:05:10.729Z'
id: SCEN-NEG-kibi-predicate-vocabulary-migration-UNDECLARED-VALUE
type: scenario
---
Given a KB with one predicate fact in the wrong namespace and another whose argument value is not declared by its schema, when kibi migrate plans and applies the safe repairs, then only the namespace drift receives an automatic predicate_schema_alignment action, and the fact with the undeclared value is left untouched and still reported by predicate-schema-conformance.

This is the failure side of predicate vocabulary migration: a value with no single safe answer must not be rewritten automatically. documentation/tests/e2e/packed/predicate-vocabulary-migration.test.ts "reports drift, migrates mechanical repairs under an approved hash, and rejects undeclared values" exercises it through FACT-POLICY-FATAL.
