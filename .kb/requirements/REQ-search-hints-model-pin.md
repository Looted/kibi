---
title: Search hints embedding model pin
status: open
priority: must
firmness: firm
tags:
  - proof
semantic_text: The search hints embedding model shall be minishlab/potion-retrieval-32M. The search hints embedding model revision shall be 6fc8051fab2a1e0ee76689cf08c853792ac285e7.
semantic_clauses:
  - The search hints embedding model shall be minishlab/potion-retrieval-32M.
  - The search hints embedding model revision shall be 6fc8051fab2a1e0ee76689cf08c853792ac285e7.
origin:
  kind: agent
  ref: 'Maintainer request, 2026-10-30, to keep proving structural requirements: "Can you continue prooving additional requirements?" Maintainer decision, 2026-11-24, on the card "Swap the search hints model to potion-retrieval-32M, superseding the firm model pin?": "Swap to potion-retrieval-32M".'
  approved_by: maintainer
  recorded_at: '2026-11-24T18:08:54.547Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: b3f461c0f14775b9093e1f1c4345c48402af3e3fd5c235639908477dc5569a9b
semantic_inventory:
  - claim_key: CLAIM-519FA42596BB464F
    claim_text: The search hints embedding model shall be minishlab/potion-retrieval-32M
    role: normative
    status: modeled
    span:
      start: 0
      end: 72
  - claim_key: CLAIM-906A2E255020711F
    claim_text: The search hints embedding model revision shall be 6fc8051fab2a1e0ee76689cf08c853792ac285e7
    role: normative
    status: modeled
    span:
      start: 74
      end: 165
logic_claims:
  - CLAIM-519FA42596BB464F
  - CLAIM-906A2E255020711F
id: REQ-search-hints-model-pin
type: req
---
The search hints embedding model shall be minishlab/potion-retrieval-32M. The search hints embedding model revision shall be 6fc8051fab2a1e0ee76689cf08c853792ac285e7.

## Context

REQ-kibi-plugin-search-hints ranks entities by potion-retrieval-32M static embeddings bundled with the plugin. The upstream model and the revision the bundled asset was built from are stated here so they are proved against packages/plugin-search-hints/src/model.ts. On 2026-11-24 the model moved from potion-base-8M (revision bf8b056651a2c21b8d2565580b8569da283cab23) to the retrieval-tuned potion-retrieval-32M: with it the reworded hints gold set shows the expected requirement for 14 of 20 questions instead of 12.

## Source

Maintainer request, 2026-10-30, to keep proving structural requirements: "Can you continue prooving additional requirements?" Maintainer decision, 2026-11-24, on the card "Swap the search hints model to potion-retrieval-32M, superseding the firm model pin?": "Swap to potion-retrieval-32M".