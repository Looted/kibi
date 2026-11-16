---
title: The search answer gives each governing requirement's statement
status: open
priority: must
required_evidence: tested
tags:
  - progressive-disclosure
  - search
semantic_text: 'Each governing requirement in a kb_search answer must carry its statement: its semantic_text, else the statement its body derives, cut to at most 300 characters.'
origin:
  kind: agent
  ref: 'Maintainer request, 2026-11-16: give the statement and the recorded reason in the first search and edit layer'
  recorded_at: '2026-11-16T15:53:47.574Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 2a05b83bc6918386f7232f5f3b0aedf7dce2f1c61bf5f2aae48cb0e1bfd6135d
semantic_inventory:
  - claim_key: CLAIM-E5FBF3D4E18C4E8D
    claim_text: 'Each governing requirement in a kb_search answer must carry its statement: its semantic_text, else the statement its body derives, cut to at most 300 characters'
    role: normative
    status: modeled
    span:
      start: 0
      end: 160
logic_claims:
  - CLAIM-E5FBF3D4E18C4E8D
id: REQ-search-answer-governing-statement
type: req
---
Each governing requirement in a kb_search answer must carry its statement: its semantic_text, else the statement its body derives, cut to at most 300 characters.

## Why

An agent searching for prior intent got the governing requirement's id, title and links, but not what the requirement says: the statement was only reachable through a second kb_query. On Kibi's own KB the search answer for a why question ran to 22k to 35k characters and still held no statement.

## Source

> Maintainer request, 2026-11-16: give the statement and the recorded reason in the first search and edit layer