---
title: kibi-plugin-search-hints ranks entities by meaning offline with a bundled static embedding
status: open
priority: should
tags:
  - plugins
  - search
  - packaging
semantic_text: kibi-plugin-search-hints must rank entities by cosine similarity of potion-retrieval-32M static embeddings computed without network access or native code. The plugin tokenizer must produce the same token ids as the upstream tokenizer of the model. The plugin must reuse a cached entity vector only when the model and the entity content hash are unchanged. The plugin package must ship the model licence and a file digest manifest that its pack step verifies.
required_evidence: tested
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer, semantic search discussion, 2026-10-29: "What model can we use with our license?" Maintainer decision, 2026-11-24, on the card "Swap the search hints model to potion-retrieval-32M, superseding the firm model pin?": "Swap to potion-retrieval-32M".'
  recorded_at: '2026-11-24T18:09:52.577Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 5d6b38f352147e05fe48acd68b60a63738c0e34989d79fbd7bd3f4406b7cd275
semantic_inventory:
  - claim_key: CLAIM-8C438A080A777AE9
    claim_text: kibi-plugin-search-hints must rank entities by cosine similarity of potion-retrieval-32M static embeddings computed without network access or native code
    role: normative
    status: modeled
    span:
      start: 0
      end: 153
  - claim_key: CLAIM-B33DD98FF26DAF36
    claim_text: The plugin tokenizer must produce the same token ids as the upstream tokenizer of the model
    role: normative
    status: modeled
    span:
      start: 155
      end: 246
  - claim_key: CLAIM-2F7D5140258BF1EA
    claim_text: The plugin must reuse a cached entity vector only when the model and the entity content hash are unchanged
    role: normative
    status: modeled
    span:
      start: 248
      end: 354
  - claim_key: CLAIM-6190500880932E01
    claim_text: The plugin package must ship the model licence and a file digest manifest that its pack step verifies
    role: normative
    status: modeled
    span:
      start: 356
      end: 457
logic_claims:
  - CLAIM-8C438A080A777AE9
  - CLAIM-B33DD98FF26DAF36
  - CLAIM-2F7D5140258BF1EA
  - CLAIM-6190500880932E01
id: REQ-kibi-plugin-search-hints
type: req
---
kibi-plugin-search-hints must rank entities by cosine similarity of potion-retrieval-32M static embeddings computed without network access or native code. The plugin tokenizer must produce the same token ids as the upstream tokenizer of the model. The plugin must reuse a cached entity vector only when the model and the entity content hash are unchanged. The plugin package must ship the model licence and a file digest manifest that its pack step verifies.

## Context

The maintainer wanted the model outside kibi-cli so a project can opt out, and asked which model Kibi's AGPL licence allows. The model is MIT licensed and runs as table lookups in plain JavaScript, so the plugin adds no native dependency and no download at run time. Tokenizer parity is checked against fixtures generated with the upstream tokenizer because a silent drift would change every vector. The vector cache lives in the runtime directory, not in .kb, and is rebuilt per entity when its text changes. Kibi now ships the plugin and turns it on by default; REQ-kibi-search-hints-default states how a project opts out. The plugin first bundled potion-base-8M (about 7.7 MB as int8); on 2026-11-24 it moved to potion-retrieval-32M (about 33 MB as int8), the same model2vec family tuned for retrieval, which shows the expected requirement for 14 instead of 12 of the 20 reworded hints gold questions and 19 instead of 17 of 20 lay questions on a product knowledge base.

## Source

> What model can we use with our license?

> Ok, could you prepare an implementation plan for the plugin?

Maintainer, semantic search discussion, 2026-10-29.

Maintainer decision, 2026-11-24, on the card "Swap the search hints model to potion-retrieval-32M, superseding the firm model pin?": "Swap to potion-retrieval-32M".
