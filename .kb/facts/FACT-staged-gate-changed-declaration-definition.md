---
title: kibi check --staged must treat a declaration as changed only when its title is absent from the base tree or its whitespace- and comment-normalized text differs from the base tree
status: active
fact_kind: property_value
subject_key: kibi.cli.check.staged
property_key: changed_declaration_means_new_title_or_normalized_text_change
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-B0D02A5A16D708F1
claim_text: kibi check --staged must treat a declaration as changed only when its title is absent from the base tree or its whitespace- and comment-normalized text differs from the base tree
text_ref: REQ-staged-gate-changed-declaration-definition
tags:
  - lane:strict
  - fact:property_value
  - staged-gate
  - symbols
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
id: FACT-staged-gate-changed-declaration-definition
type: fact
---
kibi check --staged must treat a declaration as changed only when its title is absent from the base tree or its whitespace- and comment-normalized text differs from the base tree. Grounds the clause of REQ-staged-gate-changed-declaration-definition.