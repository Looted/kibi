---
title: Predicate modeling respects a requirement's existing grounding
status: open
priority: must
tags:
  - modeling
  - predicates
  - grounding
semantic_text: Predicate modeling must report already grounded with no write plan when the requirement already grounds the claim. Predicate modeling must offer a replacement plan that keeps one grounding relationship per claim. Predicate modeling must name the planned predicate fact as the relationship target.
semantic_clauses:
  - Predicate modeling must report already grounded with no write plan when the requirement already grounds the claim.
  - Predicate modeling must offer a replacement plan that keeps one grounding relationship per claim.
  - Predicate modeling must name the planned predicate fact as the relationship target.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 01bf62026eec39e0cd68c86c93ebef2807e9f33d8f8c5d2dc41ac48cd7434ac3
semantic_inventory:
  - claim_key: CLAIM-85AF0DB853613E9F
    claim_text: Predicate modeling must report already grounded with no write plan when the requirement already grounds the claim
    role: normative
    status: modeled
    span:
      start: 0
      end: 113
  - claim_key: CLAIM-FCCA6F3E483530CE
    claim_text: Predicate modeling must offer a replacement plan that keeps one grounding relationship per claim
    role: normative
    status: modeled
    span:
      start: 115
      end: 211
  - claim_key: CLAIM-C034269633EA20C6
    claim_text: Predicate modeling must name the planned predicate fact as the relationship target
    role: normative
    status: modeled
    span:
      start: 213
      end: 295
logic_claims:
  - CLAIM-85AF0DB853613E9F
  - CLAIM-FCCA6F3E483530CE
  - CLAIM-C034269633EA20C6
origin:
  kind: agent
  recorded_at: '2026-10-07T12:28:50.072Z'
id: REQ-model-predicates-grounding-aware
type: req
---
Predicate modeling must report already grounded with no write plan when the requirement already grounds the claim. Predicate modeling must offer a replacement plan that keeps one grounding relationship per claim. Predicate modeling must name the planned predicate fact as the relationship target.

## Context
In an external onboarding evaluation kb_model with mode predicates offered a requires_predicate plan for requirements that bootstrap had already grounded with requires_property facts. Every such link failed the proposition-complete rule because a claim then had two grounding relationships, and the agent also linked candidate ids instead of the planned fact ids. The evaluation reported 22 modeled requirements while the KB held no requires_predicate links. Piotr asked for kb_model to detect existing grounding and to say which id is the relationship target.

## Source
> kb_model mode: predicates dla wymagań już ugruntowanych przez requires_property ... zwraca applyPlan + relationshipPlan z requires_predicate, bez ostrzeżenia.

Onboarding evaluation of Kibi 2.7.0 and kibi-mcp 3.2.0 in a test project, round 4 analysis (2026-10-07), finding K3.
