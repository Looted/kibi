---
title: Authored relationship loss blocks parity
status: active
text_ref: .kb/requirements/REQ-kibi-source-relationship-parity.md
tags:
  - lane:ontology
  - relationship-parity
fact_kind: property_value
subject_key: kibi.source_relationship_parity
property_key: authored_relationships_missing_from_compiled_rdf_unblocked
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-29422CD5F6D5A1D0
claim_text: Kibi check must compare every relationship authored in tracked Markdown, symbol manifests, or canonical relationship shards with compiled RDF and block when an authored edge is missing
id: FACT-SOURCE-PARITY-AUTHORED-BLOCK
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Kibi check must compare every relationship authored in tracked Markdown, symbol manifests, or canonical relationship shards with compiled RDF and block when an authored edge is missing.

