---
title: kb_check blocks an entity id that authored sources declare more than once
status: active
fact_kind: predicate
predicate_name: source_relationship_parity_policy
predicate_args:
  - authored_sources
  - duplicate_entity
  - entity_ids_declared_more_than_once
  - blocking
predicate_namespace: kibi.validation
polarity: assert
canonical_key: source_relationship_parity_policy(authored_sources,duplicate_entity,entity_ids_declared_more_than_once,blocking)
origin:
  kind: agent
  recorded_at: '2026-11-05T11:46:48.248Z'
claim_key: CLAIM-3D4659A939EA9AC1
claim_text: The kb_check operation must report a blocking violation that names the source files and titles of the declarations when authored Kibi sources declare one entity id more than once
text_ref: .kb/requirements/REQ-kibi-duplicate-entity-declarations.md
tags:
  - lane:ontology
id: FACT-PRED-duplicate-entity-declarations
type: fact
---
kb_check blocks an entity id that authored sources declare more than once. This predicate grounds the claim of REQ-kibi-duplicate-entity-declarations quoted in claim_text, so the requirement's semantic inventory counts it as modeled.