---
title: Predicate modeling reports the predicate state for grounded claims
status: open
priority: must
tags:
  - modeling
  - predicates
  - grounding
semantic_text: Predicate modeling must name the predicate state in its recommended action whether or not the requirement already grounds the claim. Predicate modeling must plan the ontology gap observation for an already grounded claim when no predicate schema fits. Predicate modeling must offer a replacement plan that keeps one grounding relationship per claim. Predicate modeling must name the planned predicate fact as the relationship target.
semantic_clauses:
  - Predicate modeling must name the predicate state in its recommended action whether or not the requirement already grounds the claim.
  - Predicate modeling must plan the ontology gap observation for an already grounded claim when no predicate schema fits.
  - Predicate modeling must offer a replacement plan that keeps one grounding relationship per claim.
  - Predicate modeling must name the planned predicate fact as the relationship target.
logic_claims:
  - CLAIM-83E2FBD496FBC853
  - CLAIM-529253F5F5784EFE
  - CLAIM-FCCA6F3E483530CE
  - CLAIM-C034269633EA20C6
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: e3547c91842e57a876311899b75683ca11afd4b008fc3fb20d35b3a517dfcaac
semantic_inventory:
  - claim_key: CLAIM-83E2FBD496FBC853
    claim_text: Predicate modeling must name the predicate state in its recommended action whether or not the requirement already grounds the claim
    role: normative
    status: modeled
    span:
      start: 0
      end: 131
  - claim_key: CLAIM-529253F5F5784EFE
    claim_text: Predicate modeling must plan the ontology gap observation for an already grounded claim when no predicate schema fits
    role: normative
    status: modeled
    span:
      start: 133
      end: 250
  - claim_key: CLAIM-FCCA6F3E483530CE
    claim_text: Predicate modeling must offer a replacement plan that keeps one grounding relationship per claim
    role: normative
    status: modeled
    span:
      start: 252
      end: 348
  - claim_key: CLAIM-C034269633EA20C6
    claim_text: Predicate modeling must name the planned predicate fact as the relationship target
    role: normative
    status: modeled
    span:
      start: 350
      end: 432
origin:
  kind: agent
  recorded_at: '2026-10-07T19:00:20.382Z'
id: REQ-model-predicates-grounding-aware-v2
type: req
---
Predicate modeling must name the predicate state in its recommended action whether or not the requirement already grounds the claim. Predicate modeling must plan the ontology gap observation for an already grounded claim when no predicate schema fits. Predicate modeling must offer a replacement plan that keeps one grounding relationship per claim. Predicate modeling must name the planned predicate fact as the relationship target.

## Context

Answering `already_grounded` for every claim a requirement already grounds hid what the agent should do next. After a bootstrap, which grounds every requirement through `requires_property`, 113 predicate calls in one evaluation answered `already_grounded`: 73 had no fitting schema (an ontology gap), 33 had a schema that needed argument bindings, and only 7 had a complete replacement. The ontology-gap observation lane disappeared for bootstrapped knowledge bases, and the warning pointed at a `replacementPlan` that was null. The grounding signal stays in `existingGrounding`; the action names the predicate state (`record_ontology_gap`, `provide_argument_bindings`, or `replace_grounding`).

## Source

Onboarding evaluation round 5 analysis (2026-10-07), finding K3b: an external agent onboarded a test project with Kibi 2.9.0 and kibi-mcp 3.4.0.
