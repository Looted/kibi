---
title: Authored relationship loss blocks parity
status: active
text_ref: documentation/requirements/REQ-kibi-source-relationship-parity.md
tags:
  - lane:ontology
  - relationship-parity
fact_kind: predicate
polarity: assert
predicate_namespace: kibi.validation
predicate_name: source_relationship_parity_policy
predicate_args:
  - authored_sources
  - authored_to_compiled
  - tracked_markdown__symbol_manifests__relationship_shards
  - blocking
canonical_key: source_relationship_parity_policy(authored_sources,authored_to_compiled,tracked_markdown__symbol_manifests__relationship_shards,blocking)
claim_key: CLAIM-29422CD5F6D5A1D0
claim_text: Kibi check must compare every relationship authored in tracked Markdown, symbol manifests, or canonical relationship shards with compiled RDF and block when an authored edge is missing
id: FACT-SOURCE-PARITY-AUTHORED-BLOCK
type: fact
---
Kibi check must compare every relationship authored in tracked Markdown, symbol manifests, or canonical relationship shards with compiled RDF and block when an authored edge is missing.

