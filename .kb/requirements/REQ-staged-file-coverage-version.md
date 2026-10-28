---
title: Staged file coverage result version
status: open
priority: must
firmness: firm
semantic_text: The staged file coverage result version shall be kibi.staged-file-coverage.v1.
semantic_clauses:
  - The staged file coverage result version shall be kibi.staged-file-coverage.v1.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T21:03:11.192Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 7bfe1ca57c4fc3c587bc7a7364df581898166374286a7235677f833837c4c82e
semantic_inventory:
  - claim_key: CLAIM-9C9F066CBB5BD3DB
    claim_text: The staged file coverage result version shall be kibi.staged-file-coverage.v1
    role: normative
    status: modeled
    span:
      start: 0
      end: 77
logic_claims:
  - CLAIM-9C9F066CBB5BD3DB
id: REQ-staged-file-coverage-version
type: req
---
The staged file coverage result version shall be kibi.staged-file-coverage.v1.

## Context

REQ-cli-staged-impact-enforcement checks every staged file against Kibi evidence and reports a versioned coverage result. The version is stated here so it is proved against the constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"