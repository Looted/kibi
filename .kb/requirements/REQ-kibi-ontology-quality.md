---
title: Kibi reports predicate schemas that carry prose instead of vocabulary
status: open
priority: must
tags:
  - ontology
  - vocabulary-convergence
semantic_text: Kibi check must report a predicate whose argument values mostly occur in only one fact as informational ontology-quality. Ontology-quality must not report predicates with fewer facts than the configured minimum.
semantic_clauses:
  - Kibi check must report a predicate whose argument values mostly occur in only one fact as informational ontology-quality.
  - Ontology-quality must not report predicates with fewer facts than the configured minimum.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: fbb20316fde646bee973da458d07de656aaf0bde84b90ca2b891bbc7492c5fda
logic_claims:
  - CLAIM-2DC407820ED898AF
  - CLAIM-47F6BF1F16E3BC9D
semantic_inventory:
  - claim_key: CLAIM-2DC407820ED898AF
    claim_text: Kibi check must report a predicate whose argument values mostly occur in only one fact as informational ontology-quality
    role: normative
    status: modeled
    span:
      start: 0
      end: 120
    reason: Grounded by a predicate fact over the narrow vocabulary-convergence schemas.
  - claim_key: CLAIM-47F6BF1F16E3BC9D
    claim_text: Ontology-quality must not report predicates with fewer facts than the configured minimum
    role: normative
    status: modeled
    span:
      start: 122
      end: 210
    reason: Grounded by a predicate fact over the narrow vocabulary-convergence schemas.
id: REQ-kibi-ontology-quality
type: req
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Firmness relabelled to default until reviewed. Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Maintainer decision, 2026-11-10, approving the entity context recovered from history in the KB gold-standard review (context batch 2): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
firmness: default
required_evidence: tested
---
Kibi check must report a predicate whose argument values mostly occur in only one fact as informational ontology-quality. Ontology-quality must not report predicates with fewer facts than the configured minimum.

## Why
A predicate whose arguments are one-off prose atoms can't be compared across requirements. In Kibi's own KB, `logical_requirement_rule` had an 88% singleton share before its vocabulary was closed. Predicates with only a few facts are skipped because a ratio over them means nothing.
