---
title: kb_author_impact_review refuses a changed staged scope
status: open
priority: must
required_evidence: tested
semantic_text: kb_author_impact_review must refuse when the staged scope's fingerprint differs from the fingerprint the call names.
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
semantic_source_hash: 01f92b556e2c87ce319f61cf3103109d4fc11557a1959ad60eba4d1f2cba844a
semantic_inventory:
  - claim_key: CLAIM-33FBE1DBB977D859
    claim_text: kb_author_impact_review must refuse when the staged scope's fingerprint differs from the fingerprint the call names
    role: normative
    status: modeled
    span:
      start: 0
      end: 115
logic_claims:
  - CLAIM-33FBE1DBB977D859
rationale: Decisions made for one staged change must not land in the record of another; the fingerprint the preparation returned is what the reviewer decided against.
id: REQ-impact-review-author-scope-fingerprint
type: req
---
kb_author_impact_review must refuse when the staged scope's fingerprint differs from the fingerprint the call names.

## Why

Decisions made for one staged change must not land in the record of another; the fingerprint the preparation returned is what the reviewer decided against.

## Context

assertScopeFingerprint compares the call's scopeFingerprint with the captured scope's and refuses with VALIDATION_FAILED before anything is written.

## Source

> Maintainer decision, 2026-11-19, approving this statement as worded.
