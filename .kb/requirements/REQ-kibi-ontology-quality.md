---
title: Kibi reports predicate schemas that carry prose instead of vocabulary
status: open
priority: must
tags:
  - ontology
  - vocabulary-convergence
  - review:context-missing
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
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Kibi check must report a predicate whose argument values mostly occur in only one fact as informational ontology-quality. Ontology-quality must not report predicates with fewer facts than the configured minimum.
