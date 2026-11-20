---
title: kb_author_impact_review refuses an invalid record and keeps the existing file
status: open
priority: must
required_evidence: tested
semantic_text: kb_author_impact_review must refuse a record that fails strict impact-review validation and leave the existing file unchanged.
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
semantic_source_hash: ce0a30348b9fc8acd51cc3f38099868eb5b484e61811cf75476139f6a029e8fd
semantic_inventory:
  - claim_key: CLAIM-0928FA5E01431358
    claim_text: kb_author_impact_review must refuse a record that fails strict impact-review validation and leave the existing file unchanged
    role: normative
    status: modeled
    span:
      start: 0
      end: 125
logic_claims:
  - CLAIM-0928FA5E01431358
rationale: A written record that the gate would reject only moves the failure to the commit, and overwriting a good record with a bad one loses the reviewer's work.
id: REQ-impact-review-author-strict
type: req
---
kb_author_impact_review must refuse a record that fails strict impact-review validation and leave the existing file unchanged.

## Why

A written record that the gate would reject only moves the failure to the commit, and overwriting a good record with a bad one loses the reviewer's work.

## Context

validatedRecord runs the gate's decision checks and the strict record parser; any failure, an undecided file, an unknown path or a path decided twice is refused before the atomic write.

## Source

> Maintainer decision, 2026-11-19, approving this statement as worded.
