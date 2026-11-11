---
title: Kibi check reviews a requirement implemented only by whole-file anchors on source that has smaller units
status: open
semantic_text: Kibi check must report a current requirement as a non-blocking coarse_anchor_only_review when every symbol that implements it is a whole-file anchor on a file a source extractor covers. A whole-file anchor on a file no source extractor covers, such as JSON, YAML or a workflow file, must not count toward the review.
semantic_clauses:
  - Kibi check must report a current requirement as a non-blocking coarse_anchor_only_review when every symbol that implements it is a whole-file anchor on a file a source extractor covers
  - A whole-file anchor on a file no source extractor covers, such as JSON, YAML or a workflow file, must not count toward the review
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 30b317c73eff4f16f7409dbdb522c371c72ca59c9896eb7ef53d8326d467abd7
semantic_inventory:
  - claim_key: CLAIM-FAA264456D9AAEAB
    claim_text: Kibi check must report a current requirement as a non-blocking coarse_anchor_only_review when every symbol that implements it is a whole-file anchor on a file a source extractor covers
    role: normative
    status: modeled
    span:
      start: 0
      end: 184
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-F4177458C080435B
    claim_text: A whole-file anchor on a file no source extractor covers, such as JSON, YAML or a workflow file, must not count toward the review
    role: normative
    status: modeled
    span:
      start: 186
      end: 315
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-FAA264456D9AAEAB
  - CLAIM-F4177458C080435B
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-11, approving the wording fixes and new requirements of the second KB gold-standard review: "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-11T17:35:19.978Z'
firmness: firm
required_evidence: tested
priority: must
tags:
  - check
  - quality
  - review
  - coverage
id: REQ-kibi-coarse-anchor-review
type: req
---
Kibi check must report a current requirement as a non-blocking coarse_anchor_only_review when every symbol that implements it is a whole-file anchor on a file a source extractor covers. A whole-file anchor on a file no source extractor covers, such as JSON, YAML or a workflow file, must not count toward the review.

## Context

A whole-file anchor says only that a test touches the file, not the code behind the claim, so the review asks for the functions or types that implement the requirement. A file no extractor covers has no smaller unit to link, so asking for one would be a review nobody can satisfy; this PR added that exemption while tightening Kibi's own ownership links.

## Source

> Maintainer decision, 2026-11-11, approving the wording fixes and new requirements of the second KB gold-standard review: "Ok"
