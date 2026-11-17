---
title: The search answer takes a requirement's reason from its records in a fixed order
status: open
priority: must
required_evidence: tested
firmness: default
tags:
  - search
  - answer
  - rationale
semantic_text: The kb_search answer must take a requirement's reason from its rationale field, then its Why, Rationale or Context section, then its Why this changed section, then its linked ADR.
rationale: The rationale field and the Why, Rationale or Context sections say why the rule exists; a Why this changed section often records only how the requirement was split or superseded, and an ADR can explain a wider decision. Taking the records that state the reason first keeps the answer's reason the one that holds now, and requirement-rationale-missing reads the same records.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the why-answer statements: "Approve all"'
  approved_by: maintainer
  recorded_at: '2026-11-16T10:21:07.797Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 156db1db086ffa2aa3be3d3bbe4061b5b083edb6e047dd8ee21c56515e41ea81
semantic_inventory:
  - claim_key: CLAIM-E2322DB31647469A
    claim_text: The kb_search answer must take a requirement's reason from its rationale field, then its Why, Rationale or Context section, then its Why this changed section, then its linked ADR
    role: normative
    status: modeled
    span:
      start: 0
      end: 178
logic_claims:
  - CLAIM-E2322DB31647469A
id: REQ-search-answer-reason-source-order
type: req
---
The kb_search answer must take a requirement's reason from its rationale field, then its Why, Rationale or Context section, then its Why this changed section, then its linked ADR.

## Context

The rationale field and the Why, Rationale or Context sections say why the rule exists; a Why this changed section often records only how the requirement was split or superseded, and an ADR can explain a wider decision. Taking the records that state the reason first keeps the answer's reason the one that holds now, and requirement-rationale-missing reads the same records.

## Why this changed

The answer took Why this changed before the Why, Rationale or Context sections, so a requirement split from a broader one answered with "Split from REQ-…" instead of its reason. Maintainer request, 2026-11-16: take a requirement's reason from its rationale and its Why, Rationale or Context sections before Why this changed, and skip split and supersede notes.

## Source

> Maintainer decision, 2026-11-16, approving the why-answer statements: "Approve all"
>
> Maintainer request, 2026-11-16: take a requirement's reason from its rationale and its Why, Rationale or Context sections before Why this changed, and skip split and supersede notes