---
title: Impact-review preparation pages its file rows within the result budget
status: open
priority: must
required_evidence: tested
semantic_text: Kibi must page the preparation's file rows within the result budget. Every page must carry the whole scope's fingerprint and file count, and neither paging nor named paths may narrow the captured inventory.
tags:
  - impact-policy
  - public-preparation
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-19, approving these statements as worded and the staged scope first, after kb_prepare_impact_review returned about 16,000 fixed characters plus about 4,000 per file and repeated each requirement for every file that names it: "Yes, please."'
  recorded_at: '2026-11-19T21:00:00.000Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 291641dde27753b0074bd311eee277fdf52dc9b206daa191779a5f574ad1983d
semantic_inventory:
  - claim_key: CLAIM-9636CFDBA0B30EAE
    claim_text: Kibi must page the preparation's file rows within the result budget
    role: normative
    status: modeled
    span:
      start: 0
      end: 67
  - claim_key: CLAIM-AA59E5E23F4284B6
    claim_text: Every page must carry the whole scope's fingerprint and file count, and neither paging nor named paths may narrow the captured inventory
    role: normative
    status: modeled
    span:
      start: 69
      end: 205
logic_claims:
  - CLAIM-9636CFDBA0B30EAE
  - CLAIM-AA59E5E23F4284B6
rationale: A large commit must stay reviewable on a host with a tool-result cap, and a page that lost the scope binding or the inventory would let a record bind to part of a change.
id: REQ-impact-review-preparation-paging
type: req
---
Kibi must page the preparation's file rows within the result budget. Every page must carry the whole scope's fingerprint and file count, and neither paging nor named paths may narrow the captured inventory.

## Why

A large commit must stay reviewable on a host with a tool-result cap, and a page that lost the scope binding or the inventory would let a record bind to part of a change.

## Context

kb_prepare_impact_review is a rows operation over files: the shared fitter cuts the rows and reports nextOffset, preparationAfterCut keeps the requirements and obligations of the kept rows, and recordHeaders and fileCount always describe the whole captured scope.

## Source

> Maintainer decision, 2026-11-19, approving this statement as worded.
