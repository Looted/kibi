---
title: A staged decision conflict between two predicate facts is reported by kibi check --staged
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:01:21.018Z'
id: SCEN-CASE-kibi-logical-requirement-coverage-staged-predicate-fields
type: scenario
---
Given two staged requirements whose staged permission_rule facts decide the same key as allow and deny, when the packed CLI runs kibi check --staged, then it fails without an operational error and reports the decision conflict with the predicate name, namespace, key arguments and both decisions, which it can only do when the staged overlay kept every typed predicate field.

documentation/tests/e2e/packed/cli-workflows.test.ts "keeps typed predicate fields in the staged overlay so a staged decision conflict is reported" exercises this edge case. It covers one typed predicate field dropped by the staged overlay, `typed_predicate_fields_dropped_by_staged_overlay gt 0`.
