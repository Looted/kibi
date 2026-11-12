---
title: Modal-free normative prose is classified as normative and each conjoined proposition stays atomic
status: open
semantic_text: Modal-free validity, rejection, prohibition, required-outcome, and failure-policy assertions shall be classified as normative. Conjunctions in the source prose shall preserve each atomic proposition in the semantic inventory.
semantic_clauses:
  - Modal-free validity, rejection, prohibition, required-outcome, and failure-policy assertions shall be classified as normative.
  - Conjunctions in the source prose shall preserve each atomic proposition in the semantic inventory.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 35a3a5d6c6e5b71e733185f3efc5866431d059e8c6d1afb82307a3054c7c33b6
semantic_inventory:
  - claim_key: CLAIM-ABA932CA8D47C522
    claim_text: Modal-free validity, rejection, prohibition, required-outcome, and failure-policy assertions shall be classified as normative
    role: normative
    status: modeled
    span:
      start: 0
      end: 125
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-5D615AA01B945895
    claim_text: Conjunctions in the source prose shall preserve each atomic proposition in the semantic inventory
    role: normative
    status: modeled
    span:
      start: 127
      end: 224
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-ABA932CA8D47C522
  - CLAIM-5D615AA01B945895
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T08:48:48.185Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - kibi
  - mcp
  - ontology
  - predicates
  - semantic-inventory
id: REQ-kibi-suggestion-prose-classification
type: req
---
Modal-free validity, rejection, prohibition, required-outcome, and failure-policy assertions shall be classified as normative. Conjunctions in the source prose shall preserve each atomic proposition in the semantic inventory.

## Context

Requirements often state rules without modal verbs and join several in one sentence, so each assertion must be recognised and kept separate before anything is suggested for it.

Predicate suggestions become facts that proofs rely on, so a schema that fits only because its arguments can be filled, a compound clause modeled whole, or a placeholder passed off as reviewed would each ground a requirement in the wrong meaning.

## Why this changed

Split from REQ-kibi-predicate-suggestion-relevance-v1, which held three behaviors: the relevance gate and its outcomes, how source prose is classified and split into atomic propositions, and the explainable fields of each suggestion. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
