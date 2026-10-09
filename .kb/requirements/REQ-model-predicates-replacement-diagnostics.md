---
title: Grounding replacement plans state their transient kb_check findings and rollback condition
status: open
tags:
  - modeling
  - predicates
  - replacement-plan
  - review:context-missing
priority: must
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-09: onboarding evaluation round 9 finding K20, replacement plan diagnostics'
  recorded_at: '2026-10-09T07:23:51.233Z'
semantic_text: A grounding replacement plan must list logic-coverage and strict-req-fact-pairing as the expected kb_check findings between the retraction and the link. A grounding replacement plan must state rollback as the response to a kb_check that is not clean after the last step.
logic_claims:
  - CLAIM-433E11881CA6CC7A
  - CLAIM-75B1BF8EF90916CF
semantic_clauses:
  - A grounding replacement plan must list logic-coverage and strict-req-fact-pairing as the expected kb_check findings between the retraction and the link.
  - A grounding replacement plan must state rollback as the response to a kb_check that is not clean after the last step.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
rationale: An Oct 9 2026 onboarding evaluation on a test project followed a replacementPlan that warned only about logic-coverage between the retraction and the link, so the strict-req-fact-pairing finding kb_check also reported looked like a failure and the rollback step gave no condition for applying it.
semantic_source_hash: 6db487fb8ee817496f5bdc1c3161963b8e70b9f5543b825e16ee87f8206d8956
semantic_inventory:
  - claim_key: CLAIM-433E11881CA6CC7A
    claim_text: A grounding replacement plan must list logic-coverage and strict-req-fact-pairing as the expected kb_check findings between the retraction and the link
    role: normative
    status: modeled
    span:
      start: 0
      end: 151
  - claim_key: CLAIM-75B1BF8EF90916CF
    claim_text: A grounding replacement plan must state rollback as the response to a kb_check that is not clean after the last step
    role: normative
    status: modeled
    span:
      start: 153
      end: 269
id: REQ-model-predicates-replacement-diagnostics
type: req
---
A grounding replacement plan must list logic-coverage and strict-req-fact-pairing as the expected kb_check findings between the retraction and the link. A grounding replacement plan must state rollback as the response to a kb_check that is not clean after the last step.

## Context

Round 9 of the onboarding evaluation on a test project ran a kb_model mode predicates replacementPlan step by step with kb_check between steps. Between retracting the old property fact and linking the new predicate fact, kb_check reports both logic-coverage and strict-req-fact-pairing for the requirement, but the plan named only logic-coverage, so the second finding read as a failure, and the rollback step gave no condition for when to apply it. The plan now carries a machine-readable expected field (findings after each step, findings after the last step, the rollback condition) and says the same in prose; the step order is unchanged. Requested by the project owner after the evaluation report.

## Source

> Onboarding evaluation round 9, finding K20: replacementPlan must state both logic-coverage and strict-req-fact-pairing as transient diagnostics between step 2 and 3, with a machine-readable expected field and the rollback condition that kb_check after the last step is not clean.