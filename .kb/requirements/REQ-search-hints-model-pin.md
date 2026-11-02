---
title: Search hints embedding model pin
status: open
priority: must
firmness: firm
tags:
  - proof
semantic_text: The search hints embedding model shall be minishlab/potion-base-8M. The search hints embedding model revision shall be bf8b056651a2c21b8d2565580b8569da283cab23.
semantic_clauses:
  - The search hints embedding model shall be minishlab/potion-base-8M.
  - The search hints embedding model revision shall be bf8b056651a2c21b8d2565580b8569da283cab23.
origin:
  kind: agent
  ref: 'Maintainer request, 2026-10-30, to keep proving structural requirements: "Can you continue prooving additional requirements?"'
  approved_by: maintainer
  recorded_at: '2026-10-30T19:43:06.335Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ba78a7bea4a26fe42942ba57225e9263e8b92fc883fb6a69daf81c7c1ba7ca78
semantic_inventory:
  - claim_key: CLAIM-1F6530C9D5F1B2F4
    claim_text: The search hints embedding model shall be minishlab/potion-base-8M
    role: normative
    status: modeled
    span:
      start: 0
      end: 66
  - claim_key: CLAIM-1B88D98CB3D0A5CB
    claim_text: The search hints embedding model revision shall be bf8b056651a2c21b8d2565580b8569da283cab23
    role: normative
    status: modeled
    span:
      start: 68
      end: 159
logic_claims:
  - CLAIM-1F6530C9D5F1B2F4
  - CLAIM-1B88D98CB3D0A5CB
id: REQ-search-hints-model-pin
type: req
---
The search hints embedding model shall be minishlab/potion-base-8M. The search hints embedding model revision shall be bf8b056651a2c21b8d2565580b8569da283cab23.

## Context

REQ-kibi-plugin-search-hints ranks entities by potion-base-8M static embeddings bundled with the plugin. The upstream model and the revision the bundled asset was built from are stated here so they are proved against packages/plugin-search-hints/src/model.ts.

## Source

Maintainer request, 2026-10-30, to keep proving structural requirements: "Can you continue prooving additional requirements?"
