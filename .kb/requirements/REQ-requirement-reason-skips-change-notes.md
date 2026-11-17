---
title: A requirement's recorded reason leaves out split and supersede notes
status: open
priority: must
required_evidence: tested
tags:
  - progressive-disclosure
  - search
  - hooks
semantic_text: A requirement's recorded reason in a kb_search answer or in an edit snippet's Why line must leave out each line that only records a split or supersession, such as "Split from REQ-…" or "Superseded by …".
origin:
  kind: agent
  ref: 'Maintainer request, 2026-11-16: take a requirement''s reason from its rationale and its Why, Rationale or Context sections before Why this changed, and skip split and supersede notes'
  approved_by: maintainer
  recorded_at: '2026-11-16T17:36:51.473Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 7bdbcc4db07dc2b1979bf17a01fa8a283e87b83873a056f80e0c9cb41d9f1464
semantic_inventory:
  - claim_key: CLAIM-2A0CD7868104DEE1
    claim_text: A requirement's recorded reason in a kb_search answer or in an edit snippet's Why line must leave out each line that only records a split or supersession, such as "Split from REQ-…" or "Superseded by …"
    role: normative
    status: modeled
    span:
      start: 0
      end: 206
logic_claims:
  - CLAIM-2A0CD7868104DEE1
id: REQ-requirement-reason-skips-change-notes
type: req
---
A requirement's recorded reason in a kb_search answer or in an edit snippet's Why line must leave out each line that only records a split or supersession, such as "Split from REQ-…" or "Superseded by …".

## Why

Many requirements split from a broader one say only "Split from REQ-…, which held three behaviors" under Why this changed. That line records where the text came from, not why the rule exists, so quoting it as the reason told an agent nothing it could weigh before changing the rule.

## Source

> Maintainer request, 2026-11-16: take a requirement's reason from its rationale and its Why, Rationale or Context sections before Why this changed, and skip split and supersede notes