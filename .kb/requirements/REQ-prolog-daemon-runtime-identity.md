---
title: The engine daemon never serves a client that resolved a different SWI-Prolog
status: open
priority: must
tags:
  - prolog
  - engine
  - daemon
  - lane:strict
  - review:context-missing
text_ref: packages/cli/src/engine.ts
semantic_text: The engine daemon handshake must report the resolved SWI-Prolog executable and version. The engine daemon must reject a request from a client whose resolved SWI-Prolog differs from its own. The engine client must replace a daemon whose resolved SWI-Prolog differs instead of reusing it
semantic_source_field: semantic_text
semantic_source_hash: 9af9122acee569b895fe3b2965878da25b2d48f5f62b1cf0bc45a6c6042af7b4
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_inventory:
  - claim_key: CLAIM-CE346706C69C1831
    claim_text: The engine daemon handshake must report the resolved SWI-Prolog executable and version
    role: normative
    status: modeled
    span:
      start: 0
      end: 86
    payload_hash: 42255935a875fcddd46377571cb0c2d7dba9d11dea5c3157279437dab78a79b7
    reason: Grounded by FACT-prolog-daemon-identity-handshake-reports-resolved-swipl via requires_property.
  - claim_key: CLAIM-ED7CB3CFD72639BC
    claim_text: The engine daemon must reject a request from a client whose resolved SWI-Prolog differs from its own
    role: normative
    status: modeled
    span:
      start: 88
      end: 188
    payload_hash: 42255935a875fcddd46377571cb0c2d7dba9d11dea5c3157279437dab78a79b7
    reason: Grounded by FACT-prolog-daemon-identity-rejects-client-with-different-swipl via requires_property.
  - claim_key: CLAIM-F778D70AA4378DC5
    claim_text: The engine client must replace a daemon whose resolved SWI-Prolog differs instead of reusing it
    role: normative
    status: modeled
    span:
      start: 190
      end: 285
    payload_hash: 42255935a875fcddd46377571cb0c2d7dba9d11dea5c3157279437dab78a79b7
    reason: Grounded by FACT-prolog-daemon-identity-replaces-daemon-with-different-swipl via requires_property.
logic_claims:
  - CLAIM-CE346706C69C1831
  - CLAIM-ED7CB3CFD72639BC
  - CLAIM-F778D70AA4378DC5
id: REQ-prolog-daemon-runtime-identity
type: req
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
The engine daemon handshake must report the resolved SWI-Prolog executable and version. The engine daemon must reject a request from a client whose resolved SWI-Prolog differs from its own. The engine client must replace a daemon whose resolved SWI-Prolog differs instead of reusing it
