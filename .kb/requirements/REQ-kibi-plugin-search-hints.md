---
title: kibi-plugin-search-hints ranks entities by meaning offline with a bundled static embedding
status: open
priority: should
tags:
  - plugins
  - search
  - packaging
semantic_text: kibi-plugin-search-hints must rank entities by cosine similarity of potion-base-8M static embeddings computed without network access or native code. The plugin tokenizer must produce the same token ids as the upstream tokenizer of the model. The plugin must reuse a cached entity vector only when the model and the entity content hash are unchanged. The plugin package must ship the model licence and a file digest manifest that its pack step verifies. The bootstrap plan must offer kibi-plugin-search-hints in replace mode when the KB holds 50 or more requirement documents and the project has neither activated nor declined it.
required_evidence: tested
origin:
  kind: agent
  recorded_at: '2026-10-29T19:17:29.834Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 9c9f0cf209f898af394934b3b5ac006cd0108da13db3507ba50457ebbc3de947
semantic_inventory:
  - claim_key: CLAIM-FA48BA021EE5A51C
    claim_text: kibi-plugin-search-hints must rank entities by cosine similarity of potion-base-8M static embeddings computed without network access or native code
    role: normative
    status: modeled
    span:
      start: 0
      end: 147
  - claim_key: CLAIM-B33DD98FF26DAF36
    claim_text: The plugin tokenizer must produce the same token ids as the upstream tokenizer of the model
    role: normative
    status: modeled
    span:
      start: 149
      end: 240
  - claim_key: CLAIM-2F7D5140258BF1EA
    claim_text: The plugin must reuse a cached entity vector only when the model and the entity content hash are unchanged
    role: normative
    status: modeled
    span:
      start: 242
      end: 348
  - claim_key: CLAIM-6190500880932E01
    claim_text: The plugin package must ship the model licence and a file digest manifest that its pack step verifies
    role: normative
    status: modeled
    span:
      start: 350
      end: 451
  - claim_key: CLAIM-A286FC226D97BF6F
    claim_text: The bootstrap plan must offer kibi-plugin-search-hints in replace mode when the KB holds 50 or more requirement documents and the project has neither activated nor declined it
    role: normative
    status: modeled
    span:
      start: 453
      end: 628
logic_claims:
  - CLAIM-FA48BA021EE5A51C
  - CLAIM-B33DD98FF26DAF36
  - CLAIM-2F7D5140258BF1EA
  - CLAIM-6190500880932E01
  - CLAIM-A286FC226D97BF6F
id: REQ-kibi-plugin-search-hints
type: req
---
kibi-plugin-search-hints must rank entities by cosine similarity of potion-base-8M static embeddings computed without network access or native code. The plugin tokenizer must produce the same token ids as the upstream tokenizer of the model. The plugin must reuse a cached entity vector only when the model and the entity content hash are unchanged. The plugin package must ship the model licence and a file digest manifest that its pack step verifies. The bootstrap plan must offer kibi-plugin-search-hints in replace mode when the KB holds 50 or more requirement documents and the project has neither activated nor declined it.

## Context

The maintainer wanted the model outside kibi-cli so a project can opt in or out, and asked which model Kibi's AGPL licence allows. potion-base-8M is MIT licensed, about 7.7 MB as int8, and runs as table lookups in plain JavaScript, so the plugin adds no native dependency and no download at run time. Tokenizer parity is checked against fixtures generated with the upstream tokenizer because a silent drift would change every vector. The vector cache lives in the runtime directory, not in .kb, and is rebuilt per entity when its text changes. Below about 50 requirements a reader can scan the list, so bootstrap offers the plugin only above that.

## Source

> What model can we use with our license?

> Ok, could you prepare an implementation plan for the plugin?

Maintainer, project thread on semantic search, 2026-10-29.
