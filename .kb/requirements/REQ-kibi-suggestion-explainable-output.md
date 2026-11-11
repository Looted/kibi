---
title: Each predicate suggestion shows why it was ranked and never counts a generic value as a reviewed binding
status: open
semantic_text: The output shall expose eligibility, rejection_reasons, binding_provenance, applicability_score, and score components without treating generic inferred values as reviewed bindings.
semantic_clauses:
  - The output shall expose eligibility, rejection_reasons, binding_provenance, applicability_score, and score components without treating generic inferred values as reviewed bindings.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a096f1644c056ed35a7056e76ef9d7af8e24e53ec36025c76fdce9e696f4bfa0
semantic_inventory:
  - claim_key: CLAIM-F445257BCA5C30BB
    claim_text: The output shall expose eligibility, rejection_reasons, binding_provenance, applicability_score, and score components without treating generic inferred values as reviewed bindings
    role: normative
    status: modeled
    span:
      start: 0
      end: 179
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-F445257BCA5C30BB
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T08:49:00.109Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - kibi
  - mcp
  - ontology
  - predicates
  - explainability
id: REQ-kibi-suggestion-explainable-output
type: req
---
The output shall expose eligibility, rejection_reasons, binding_provenance, applicability_score, and score components without treating generic inferred values as reviewed bindings.

## Context

A reviewer accepts or rejects a suggestion from its eligibility, reasons, provenance and score, so those must be visible and honest about which bindings were really reviewed.

Predicate suggestions become facts that proofs rely on, so a schema that fits only because its arguments can be filled, a compound clause modeled whole, or a placeholder passed off as reviewed would each ground a requirement in the wrong meaning.

## Why this changed

Split from REQ-kibi-predicate-suggestion-relevance-v1, which held three behaviors: the relevance gate and its outcomes, how source prose is classified and split into atomic propositions, and the explainable fields of each suggestion. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
