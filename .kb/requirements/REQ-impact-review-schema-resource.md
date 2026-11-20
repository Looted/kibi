---
title: The impact-review record schema is a kibi-commit-review skill resource
status: open
priority: must
required_evidence: tested
semantic_text: Kibi must publish the impact-review record schema once, as a kibi-commit-review skill resource, instead of inside each preparation.
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
semantic_source_hash: a93ac750182481b662ad9c3e4c5f44ab007d6f715b59324672058d78ab3306ff
semantic_inventory:
  - claim_key: CLAIM-26E246E380BF1B37
    claim_text: Kibi must publish the impact-review record schema once, as a kibi-commit-review skill resource, instead of inside each preparation
    role: normative
    status: modeled
    span:
      start: 0
      end: 130
logic_claims:
  - CLAIM-26E246E380BF1B37
rationale: Two copies of the 7,500-character schema rode along with every preparation, although an agent needs it at most once and kb_author_impact_review validates the record itself.
id: REQ-impact-review-schema-resource
type: req
---
Kibi must publish the impact-review record schema once, as a kibi-commit-review skill resource, instead of inside each preparation.

## Why

Two copies of the 7,500-character schema rode along with every preparation, although an agent needs it at most once and kb_author_impact_review validates the record itself.

## Context

The skill resource resources/impact-review.schema.json is the shipped traceability schema byte for byte, and a preparation's authoring names the skill, the resource and the schema id.

## Source

> Maintainer decision, 2026-11-19, approving this statement as worded.
