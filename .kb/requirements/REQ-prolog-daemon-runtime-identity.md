---
title: The engine daemon never serves a client that resolved a different SWI-Prolog
status: open
priority: must
tags:
  - prolog
  - engine
  - daemon
  - lane:strict
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
  ref: 'kibi migrate v5->v6 Firmness relabelled to default until reviewed. Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 4): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
firmness: default
required_evidence: tested
---
The engine daemon handshake must report the resolved SWI-Prolog executable and version. The engine daemon must reject a request from a client whose resolved SWI-Prolog differs from its own. The engine client must replace a daemon whose resolved SWI-Prolog differs instead of reusing it

## Why
Once Kibi could resolve SWI-Prolog from an environment variable, a bundle or PATH, two clients in one workspace could resolve different binaries. A daemon started with one of them must not answer the other, so a mismatched client gets a restarted daemon, never a reused one. Source: PR 299 phase 3.
