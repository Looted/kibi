---
title: kb_author_impact_review writes the record from the reviewer's decisions and Kibi's evidence
status: open
priority: must
required_evidence: tested
semantic_text: kb_author_impact_review must write .kibi/impact-review.json from the reviewer's per-file decisions and analysis reviews, reviewer id and review time, combined with the evidence Kibi captures itself.
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
semantic_source_hash: 54c03948df19d26b5f0defed5e12f7299bc5254087467edc2cdea4cf40c75366
semantic_inventory:
  - claim_key: CLAIM-96D2449D3AE73965
    claim_text: kb_author_impact_review must write .kibi/impact-review.json from the reviewer's per-file decisions and analysis reviews, reviewer id and review time, combined with the evidence Kibi captures itself
    role: normative
    status: modeled
    span:
      start: 0
      end: 197
logic_claims:
  - CLAIM-96D2449D3AE73965
rationale: Writing the record by hand meant copying every file's evidence back out of the preparation, the largest part of an impact review's cost, and a slip in a copied byte failed the gate.
id: REQ-impact-review-author-write
type: req
---
kb_author_impact_review must write .kibi/impact-review.json from the reviewer's per-file decisions and analysis reviews, reviewer id and review time, combined with the evidence Kibi captures itself.

## Why

Writing the record by hand meant copying every file's evidence back out of the preparation, the largest part of an impact review's cost, and a slip in a copied byte failed the gate.

## Context

The staged scope only at first. executeAuthorImpactReview captures the scope as the gate does, builds the record with createImpactReviewRecord and writes it with writeRecord, through a temporary file and a rename.

## Source

> Maintainer decision, 2026-11-19, approving this statement as worded.
