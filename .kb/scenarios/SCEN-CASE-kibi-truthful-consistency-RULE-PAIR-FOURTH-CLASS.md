---
title: Opposing rule pairs are only ever contradiction, disjoint or unresolved, never a silent no conflict
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:08:40.959Z'
id: SCEN-CASE-kibi-truthful-consistency-RULE-PAIR-FOURTH-CLASS
type: scenario
---
Given a permit rule for alerts above 0 and forbid rules for readings at most 0 and above 5, written through kibi model and kibi upsert, when kb_check runs domain-contradictions, then the overlapping pair is a contradiction and the undecidable pair is unresolved with a key-arguments advisory; once reading/2 declares its sensor key, that pair becomes disjoint and drops out while the contradiction stays.

This covers a class outside the set, a value outside [contradiction, disjoint, unresolved] such as a no conflict verdict for an unresolved overlap. packages/cli/tests/consumer/truthful-consistency.test.ts "classifies each opposing rule pair as contradiction, disjoint or unresolved" exercises it through kibi check, asserting every reported pair and its class.
