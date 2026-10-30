---
title: An upsert that uses an argument alias is rejected and names the declared constant
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:03:58.941Z'
id: SCEN-NEG-kibi-predicate-argument-constants-ALIAS-UPSERT
type: scenario
---
Given a predicate schema whose severity argument declares the constant warning with the alias warn, when a new predicate fact is upserted with warn as that argument, then the upsert is rejected and the error says the argument uses alias warn and names the declared constant warning.

This is the failure side of closed argument vocabularies: an alias spelling must not be stored as a second term for the same constant. documentation/tests/e2e/packed/predicate-vocabulary-migration.test.ts "reports drift, migrates mechanical repairs under an approved hash, and rejects undeclared values" exercises it in its final upsert step.
