---
title: Search hints are ordered by the summed score of the hits behind each
status: open
firmness: default
priority: should
required_evidence: tested
tags:
  - search
  - plugins
origin:
  kind: agent
  ref: 'Maintainer approval, 2026-11-24: Approved.'
  approved_by: maintainer
  recorded_at: '2026-11-24T11:27:40.935Z'
rationale: A provider hit linked to several requirements took one of the ten places for each of them, so a requirement that several lower hits agreed on was cut from the list.
semantic_text: Search hints must be ordered by summed provider hit score, highest first.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: e8579a8a628dd2915d96e0d1c4ebedb87e6edab427ec9c5b0e026cc392602ba0
semantic_inventory:
  - claim_key: CLAIM-1DEDA988FF6CAE5A
    claim_text: Search hints must be ordered by summed provider hit score, highest first
    role: normative
    status: modeled
    span:
      start: 0
      end: 72
logic_claims:
  - CLAIM-1DEDA988FF6CAE5A
id: REQ-kibi-search-hints-summed-order
type: req
---
Search hints must be ordered by summed provider hit score, highest first.

## Context

A provider hit linked to several requirements took one of the ten places for each of them, so a requirement that several lower hits agreed on was cut from the list.
