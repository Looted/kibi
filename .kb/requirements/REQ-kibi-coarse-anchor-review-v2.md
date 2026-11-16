---
title: Kibi check reviews a requirement implemented only by whole-file anchors on source that declares a behavioral symbol
status: open
priority: must
firmness: firm
required_evidence: tested
tags:
  - check
  - quality
  - review
  - coverage
semantic_text: Kibi check must report a current requirement as a non-blocking coarse_anchor_only_review when every symbol that implements it is a whole-file anchor on a source file that declares at least one behavioral symbol. A whole-file anchor on a file no source extractor covers, such as JSON, YAML or a workflow file, or on a source file that declares no behavioral symbol, such as a flat ESLint config, must not count toward the review.
semantic_clauses:
  - Kibi check must report a current requirement as a non-blocking coarse_anchor_only_review when every symbol that implements it is a whole-file anchor on a source file that declares at least one behavioral symbol
  - A whole-file anchor on a file no source extractor covers, such as JSON, YAML or a workflow file, or on a source file that declares no behavioral symbol, such as a flat ESLint config, must not count toward the review
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-15, approving the superseding coarse-anchor requirement wording: "Approve"'
  approved_by: maintainer
  recorded_at: '2026-11-15T22:01:05.394Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 807da3f6dd096a84a8e2063f89173cc539df3692f37f769014608f9c23666b52
semantic_inventory:
  - claim_key: CLAIM-8D695E2B34B7FEF8
    claim_text: Kibi check must report a current requirement as a non-blocking coarse_anchor_only_review when every symbol that implements it is a whole-file anchor on a source file that declares at least one behavioral symbol
    role: normative
    status: modeled
    span:
      start: 0
      end: 210
  - claim_key: CLAIM-073B85C371DDA5F1
    claim_text: A whole-file anchor on a file no source extractor covers, such as JSON, YAML or a workflow file, or on a source file that declares no behavioral symbol, such as a flat ESLint config, must not count toward the review
    role: normative
    status: modeled
    span:
      start: 212
      end: 427
logic_claims:
  - CLAIM-8D695E2B34B7FEF8
  - CLAIM-073B85C371DDA5F1
id: REQ-kibi-coarse-anchor-review-v2
type: req
---
Kibi check must report a current requirement as a non-blocking coarse_anchor_only_review when every symbol that implements it is a whole-file anchor on a source file that declares at least one behavioral symbol. A whole-file anchor on a file no source extractor covers, such as JSON, YAML or a workflow file, or on a source file that declares no behavioral symbol, such as a flat ESLint config, must not count toward the review.

## Context

A whole-file anchor says only that a test touches the file, not the code behind the claim, so the review asks for the functions or types that implement the requirement. A file with no smaller unit to link makes that a review nobody can satisfy. The earlier requirement exempted only files no extractor covers, so a flat `eslint.config.js`, which a JavaScript extractor reads but which exports only a config array, was still reviewed (issue #743). The maintainer approved this wording on 2026-11-15.

## Why this changed

This supersedes REQ-kibi-coarse-anchor-review, which counted a whole-file anchor on any file a source extractor covers. The review now counts only files the extractor finds a behavioral declaration in, the same set symbol-granularity lists as available granular symbols.

## Source

> Maintainer decision, 2026-11-15, approving the superseding coarse-anchor requirement wording: "Approve"
