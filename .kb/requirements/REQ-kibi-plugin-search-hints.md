---
title: kibi-plugin-search-hints ranks entities by meaning offline with a bundled static embedding
status: open
priority: should
tags:
  - plugins
  - search
  - packaging
semantic_text: kibi-plugin-search-hints must rank entities by cosine similarity of potion-base-8M static embeddings computed without network access or native code. The plugin tokenizer must produce the same token ids as the upstream tokenizer of the model. The plugin must reuse a cached entity vector only when the model and the entity content hash are unchanged. The plugin package must ship the model licence and a file digest manifest that its pack step verifies.
required_evidence: tested
origin:
  kind: agent
  approved_by: maintainer
  recorded_at: '2026-10-29T19:17:29.834Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: bd9777dea2211a25e538b1ef05ac20f6f7bc0b073f8166dbbc19a32615661ad9
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
logic_claims:
  - CLAIM-FA48BA021EE5A51C
  - CLAIM-B33DD98FF26DAF36
  - CLAIM-2F7D5140258BF1EA
  - CLAIM-6190500880932E01
id: REQ-kibi-plugin-search-hints
type: req
---
kibi-plugin-search-hints must rank entities by cosine similarity of potion-base-8M static embeddings computed without network access or native code. The plugin tokenizer must produce the same token ids as the upstream tokenizer of the model. The plugin must reuse a cached entity vector only when the model and the entity content hash are unchanged. The plugin package must ship the model licence and a file digest manifest that its pack step verifies.

## Context

The maintainer wanted the model outside kibi-cli so a project can opt out, and asked which model Kibi's AGPL licence allows. potion-base-8M is MIT licensed, about 7.7 MB as int8, and runs as table lookups in plain JavaScript, so the plugin adds no native dependency and no download at run time. Tokenizer parity is checked against fixtures generated with the upstream tokenizer because a silent drift would change every vector. The vector cache lives in the runtime directory, not in .kb, and is rebuilt per entity when its text changes. Kibi now ships the plugin and turns it on by default; REQ-kibi-search-hints-default states how a project opts out.

## Source

> What model can we use with our license?

> Ok, could you prepare an implementation plan for the plugin?

Maintainer, semantic search discussion, 2026-10-29.