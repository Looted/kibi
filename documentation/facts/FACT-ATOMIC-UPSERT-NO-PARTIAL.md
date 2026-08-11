---
id: FACT-ATOMIC-UPSERT-NO-PARTIAL
title: Failed upsert stages do not publish partial durable state
status: active
created_at: 2026-08-11T00:00:00Z
updated_at: 2026-08-11T00:00:00Z
source: documentation/facts/FACT-ATOMIC-UPsert-NO-PARTIAL.md
tags: [lane:ontology, persistence, upsert, atomicity]
fact_kind: predicate
predicate_namespace: kibi.persistence
predicate_name: upsert_failure_is_not_durable
predicate_args: [pre_save_stage, entity, relationships]
canonical_key: upsert_failure_is_not_durable(pre_save_stage,entity,relationships)
polarity: assert
claim_key: CLAIM-8D6381B25F6A5C44
claim_text: A failed or timed-out pre-save stage must not publish the entity or relationships as durable state
claim_span_start: 305
claim_span_end: 403
---

Ground representation of the no-partial-durability guarantee.
