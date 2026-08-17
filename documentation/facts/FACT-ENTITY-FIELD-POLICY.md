---
title: Required and optional entity fields
status: active
text_ref: documentation/requirements/REQ-004.md
tags:
  - lane:ontology
  - strict-semantics
fact_kind: predicate
polarity: assert
predicate_namespace: kibi.domain
predicate_name: entity_field_policy
predicate_args:
  - kibi_entity_model
  - id__type__title__status__created_at__updated_at
  - priority__tags__owner__source__links
canonical_key: entity_field_policy(kibi_entity_model,id__type__title__status__created_at__updated_at,priority__tags__owner__source__links)
claim_key: CLAIM-2DB9C3841ACC3703
claim_text: Each has required fields (`id`, `type`, `title`, `status`, `created_at`, `updated_at`) and optional fields (`priority`, `tags`, `owner`, `source`, `links`)
id: FACT-ENTITY-FIELD-POLICY
type: fact
---
Each has required fields (`id`, `type`, `title`, `status`, `created_at`, `updated_at`) and optional fields (`priority`, `tags`, `owner`, `source`, `links`).

