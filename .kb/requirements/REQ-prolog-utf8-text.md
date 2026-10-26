---
title: Text keeps its characters through the SWI-Prolog process whatever the locale
status: open
required_evidence: tested
priority: must
tags:
  - prolog
  - encoding
  - kb
semantic_text: Kibi must keep every non-ASCII character intact in text it exchanges with its SWI-Prolog process, whatever the process locale. Kibi must decode Prolog output so that a multi-byte character divided between output chunks stays whole.
semantic_clauses:
  - Kibi must keep every non-ASCII character intact in text it exchanges with its SWI-Prolog process, whatever the process locale
  - Kibi must decode Prolog output so that a multi-byte character divided between output chunks stays whole
semantic_inventory:
  - claim_key: CLAIM-C44C63661AC415EE
    claim_text: Kibi must keep every non-ASCII character intact in text it exchanges with its SWI-Prolog process, whatever the process locale
    role: normative
    status: modeled
    span:
      start: 0
      end: 125
  - claim_key: CLAIM-F5088C6A06F70549
    claim_text: Kibi must decode Prolog output so that a multi-byte character divided between output chunks stays whole
    role: normative
    status: modeled
    span:
      start: 127
      end: 230
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: f80240395b2de646821d62dbf871e12f92cd4158614adfc85ac3bcafb33e9b2d
logic_claims:
  - CLAIM-C44C63661AC415EE
  - CLAIM-F5088C6A06F70549
origin:
  kind: agent
  recorded_at: '2026-10-14T20:16:31.326Z'
id: REQ-prolog-utf8-text
type: req
---
Kibi must keep every non-ASCII character intact in text it exchanges with its SWI-Prolog process, whatever the process locale. Kibi must decode Prolog output so that a multi-byte character divided between output chunks stays whole.

## Context

SWI-Prolog decodes its standard streams and environment with the process locale. Under a POSIX locale every non-ASCII byte Kibi sent to the Prolog process became U+FFFD, so the store held replacement characters and the next write of the entity persisted them to its authored file: a write that only set firmness rewrote `§3 ¶3` in a requirement's `text_ref`. Reason: text in the knowledge base must survive sync, query and upsert unchanged.

## Source

Observed on a test project: a metadata-only kb_upsert replaced the section and paragraph signs in an untouched field with replacement characters.
