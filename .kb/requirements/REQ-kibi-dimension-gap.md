---
title: A quantified claim is not tested while it is grounded only on its verdict
status: open
priority: must
firmness: firm
tags:
  - proof
  - modeling
semantic_text: A current requirement must not reach tested while a claim that quantifies over a collection or bounds a cardinality is grounded only on a boolean or a ground predicate. A grounding fact may record a dimension waiver, which must count only once a person approves it. The semantic advisor must mark a normative clause that quantifies over a collection with the typed groundings that represent it.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: eb30f81e84d8c184ee34039bb0e31f7f63ca56c13b66c3476140b89c602e4305
semantic_inventory:
  - claim_key: CLAIM-002E0D75DB2C900C
    claim_text: A current requirement must not reach tested while a claim that quantifies over a collection or bounds a cardinality is grounded only on a boolean or a ground predicate
    role: normative
    span:
      start: 0
      end: 167
    status: modeled
  - claim_key: CLAIM-3EB8C9CD7D19D63B
    claim_text: A grounding fact may record a dimension waiver, which must count only once a person approves it
    role: normative
    span:
      start: 169
      end: 264
    status: modeled
  - claim_key: CLAIM-380DA0EC75237660
    claim_text: The semantic advisor must mark a normative clause that quantifies over a collection with the typed groundings that represent it
    role: normative
    span:
      start: 266
      end: 393
    status: modeled
logic_claims:
  - CLAIM-002E0D75DB2C900C
  - CLAIM-3EB8C9CD7D19D63B
  - CLAIM-380DA0EC75237660
origin:
  kind: agent
  ref: 'Maintainer request, 2026-10-29: "Can we somehow work the gap using better modeling, so updating our skills?"'
  approved_by: maintainer
  recorded_at: '2026-10-30T12:10:00.000Z'
id: REQ-kibi-dimension-gap
type: req
---
A current requirement must not reach tested while a claim that quantifies over a collection or bounds a cardinality is grounded only on a boolean or a ground predicate. A grounding fact may record a dimension waiver, which must count only once a person approves it. The semantic advisor must mark a normative clause that quantifies over a collection with the typed groundings that represent it.

## Context

A requirement can be tested and still break on the second item: in a test project, a feature passed every end-to-end test while one file was loaded into a module and broke with several, and its claim was grounded as a boolean that said the files were instrumented. A boolean states the verdict but not the dimension it holds over, so nothing asks for a scenario with zero, one or many files. Kibi already sees the quantifier in the claim text, so it can tell when a claim that ranges over a collection, or bounds a count, has nothing that can vary. The maintainer asked to close that gap through better modeling; this blocks tested until the claim is grounded on a count, a bound, a set, a rule over a variable or a state machine. Some quantifier words range over nothing, so a grounding fact can carry a waiver a person approves.

## Source

Maintainer request, 2026-10-29:

> Can we somehow work the gap using better modeling, so updating our skills?
