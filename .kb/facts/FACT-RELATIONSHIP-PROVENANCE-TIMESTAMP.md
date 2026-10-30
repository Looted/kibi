---
title: No RDF relationship triple lacks a provenance timestamp
status: active
text_ref: .kb/requirements/REQ-005.md
tags:
  - lane:ontology
  - strict-semantics
fact_kind: property_value
subject_key: kibi.schema.relationship_model
property_key: rdf_relationship_triples_without_provenance_timestamp
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-0E945281945C4055
claim_text: Each relationship triple is stored in RDF with a provenance timestamp
links:
  - type: relates_to
    target: FACT-RELATIONSHIP-AUDIT-METADATA
id: FACT-RELATIONSHIP-PROVENANCE-TIMESTAMP
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Each relationship triple is stored in RDF with a provenance timestamp.

