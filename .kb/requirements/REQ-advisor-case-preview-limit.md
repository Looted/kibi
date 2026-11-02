---
title: Semantic advisor case preview limit
status: open
priority: must
firmness: firm
tags:
  - proof
semantic_text: A semantic advisor case preview shall list at most 12 cases for one fact.
semantic_clauses:
  - A semantic advisor case preview shall list at most 12 cases for one fact.
origin:
  kind: agent
  ref: 'Maintainer request, 2026-10-30, to keep proving structural requirements: "Can you continue prooving additional requirements?"'
  approved_by: maintainer
  recorded_at: '2026-10-30T19:44:09.418Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 46734af88ddf0a4c9eabdcf53470effdd98af2f5b868f820152617058edd0d36
semantic_inventory:
  - claim_key: CLAIM-1C3E1A366E29113D
    claim_text: A semantic advisor case preview shall list at most 12 cases for one fact
    role: normative
    status: modeled
    span:
      start: 0
      end: 72
logic_claims:
  - CLAIM-1C3E1A366E29113D
id: REQ-advisor-case-preview-limit
type: req
---
A semantic advisor case preview shall list at most 12 cases for one fact.

## Context

REQ-kibi-case-coverage has the semantic advisor preview the edge cases of a strict-property suggestion. How many cases the preview lists for one fact is stated here so it is proved against CASE_LIMIT in packages/cli/src/operations/semantic-advisor/case-preview.ts.

## Source

Maintainer request, 2026-10-30, to keep proving structural requirements: "Can you continue prooving additional requirements?"
