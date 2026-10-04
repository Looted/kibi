---
title: New numeric IDs are entity-id-style warnings
status: active
fact_kind: predicate
predicate_name: check_finding_policy
predicate_namespace: kibi.checks
predicate_args:
  - entity_id_style
  - new_numeric_id
  - warning
polarity: assert
canonical_key: check_finding_policy(entity_id_style,new_numeric_id,warning)
claim_key: CLAIM-7DEF5563491F6A34
claim_text: Kibi must report a purely numeric entity ID as an entity-id-style warning where the entity is created
text_ref: .kb/requirements/REQ-kibi-entity-id-style.md
tags:
  - lane:ontology
  - vocabulary-convergence
id: FACT-ENTITY-ID-STYLE-NEW-NUMERIC-ID
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
