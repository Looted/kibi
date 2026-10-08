---
title: Predicate subjects come from the requirement's subject fact
status: closed
priority: must
tags:
  - modeling
  - predicates
  - bindings
semantic_text: Predicate modeling must bind the subject argument to the subject key of the subject fact that the requirement constrains. Predicate modeling must leave the subject argument unbound for a requirement without a subject fact.
semantic_clauses:
  - Predicate modeling must bind the subject argument to the subject key of the subject fact that the requirement constrains.
  - Predicate modeling must leave the subject argument unbound for a requirement without a subject fact.
logic_claims:
  - CLAIM-6D25C7724AB47201
  - CLAIM-139A118D7DD550F8
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ada9356888d101411f38ee37ce79b03d26d7d8c0296950721a6c4af78e8c74c1
semantic_inventory:
  - claim_key: CLAIM-6D25C7724AB47201
    claim_text: Predicate modeling must bind the subject argument to the subject key of the subject fact that the requirement constrains
    role: normative
    status: modeled
    span:
      start: 0
      end: 120
  - claim_key: CLAIM-139A118D7DD550F8
    claim_text: Predicate modeling must leave the subject argument unbound for a requirement without a subject fact
    role: normative
    status: modeled
    span:
      start: 122
      end: 221
origin:
  kind: agent
  recorded_at: '2026-10-08T15:34:46.920Z'
id: REQ-model-predicates-requirement-subject
type: req
---
Predicate modeling must bind the subject argument to the subject key of the subject fact that the requirement constrains. Predicate modeling must leave the subject argument unbound for a requirement without a subject fact.

## Context

On a test project, `kb_model` mode `predicates` was called with a `requirementId` whose requirement already constrained the subject fact `annotation.pressing_escape.editing`, yet the suggested predicate used the built-in demo subject `editor.annotation`, and a probe left `subject` unbound with that demo value as its only example. After a grounding replacement the predicate and the subject fact named one subject with two identifiers, so contradiction checks by subject could not pair them. The subject now comes from the requirement, and the keyword guesses apply only to free text without a requirement.

## Source

Onboarding evaluation round 7 analysis (2026-10-08), finding K13. The claim is modeled as semantic facts through the strict lane.