---
title: kb_upsert keeps a requirement's body statement in step with its semantic_text
status: open
required_evidence: tested
priority: must
tags:
  - kb
  - upsert
firmness: default
semantic_text: Kibi kb_upsert must replace the statement in a requirement's document body with the new semantic_text when a write changes the requirement's semantic_text without a document body, and must keep the body's context sections.
semantic_clauses:
  - Kibi kb_upsert must replace the statement in a requirement's document body with the new semantic_text when a write changes the requirement's semantic_text without a document body, and must keep the body's context sections
logic_claims:
  - CLAIM-63DFD25E686C97ED
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 760e58fbbd8ff06a14d1432a41621fb074ebdc37f0caa685e6b61da884c163a1
semantic_inventory:
  - claim_key: CLAIM-63DFD25E686C97ED
    claim_text: Kibi kb_upsert must replace the statement in a requirement's document body with the new semantic_text when a write changes the requirement's semantic_text without a document body, and must keep the body's context sections
    role: normative
    status: modeled
    span:
      start: 0
      end: 221
origin:
  kind: agent
  recorded_at: '2026-10-14T14:43:06.594Z'
id: REQ-kb-upsert-statement-follows-semantic-text
type: req
---
Kibi kb_upsert must replace the statement in a requirement's document body with the new semantic_text when a write changes the requirement's semantic_text without a document body, and must keep the body's context sections.

## Context

An agent that recorded a changed decision with kb_upsert (a new semantic_text, no document.body) left the requirement's Markdown body unchanged. The front matter and claims carried the new statement while the body still stated the old one, and kb_search quotes the body, so a later agent read the old decision as current and reverted the person's change. kibi sync saw nothing to do because the front matter was already consistent. Requested by the project owner after a benchmark run reproduced it.
