---
title: kb_check passes while authored sources declare one entity id more than once
status: active
fact_kind: predicate
predicate_name: source_relationship_parity_policy
predicate_args:
  - authored_sources
  - duplicate_entity
  - entity_ids_declared_more_than_once
  - blocking
predicate_namespace: kibi.validation
polarity: deny
canonical_key: source_relationship_parity_policy(authored_sources,duplicate_entity,entity_ids_declared_more_than_once,blocking)
origin:
  kind: agent
  recorded_at: '2026-11-05T11:46:49.772Z'
id: FACT-NEG-duplicate-entity-declarations
type: fact
---
kb_check passes while authored sources declare one entity id more than once. The failure-side scenario of REQ-kibi-duplicate-entity-declarations assumes this state and expects Kibi to report it instead of carrying on silently.