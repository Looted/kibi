---
title: kb_author_impact_review stages, decides and proves nothing itself
status: open
priority: must
required_evidence: tested
semantic_text: kb_author_impact_review must not stage the record, generate a decision or rationale, or create proof.
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
semantic_source_hash: 8d929049638bedb50ec465c7a6996eaa8148e99bad1c64e4ca211d5138f23e97
semantic_inventory:
  - claim_key: CLAIM-5CFD8F771C997F6E
    claim_text: kb_author_impact_review must not stage the record, generate a decision or rationale, or create proof
    role: normative
    status: modeled
    span:
      start: 0
      end: 100
logic_claims:
  - CLAIM-5CFD8F771C997F6E
rationale: 'The record is the reviewer''s self-claimed review: Kibi writing decisions or staging them would turn a tool into an approver, and proof comes only from tests.'
id: REQ-impact-review-author-no-generation
type: req
---
kb_author_impact_review must not stage the record, generate a decision or rationale, or create proof.

## Why

The record is the reviewer's self-claimed review: Kibi writing decisions or staging them would turn a tool into an approver, and proof comes only from tests.

## Context

executeAuthorImpactReview writes only .kibi/impact-review.json, from the decisions sent or kept, and its result says staged false and tells the agent to stage the record with git add -f.

## Source

> Maintainer decision, 2026-11-19, approving this statement as worded.
