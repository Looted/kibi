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
semantic_text: The kb_search answer must take a requirement's reason from its rationale field, then its Why this changed section, then its Why, Rationale or Context section, then its linked ADR.
rationale: The rationale field and the Why this changed section are written for the current rule; a Context section and an ADR can explain an earlier version or a wider decision. Taking the most specific record first keeps the answer's reason the one that holds now, and requirement-rationale-missing reads the same records.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the why-answer statements: "Approve all"'
  approved_by: maintainer
  recorded_at: '2026-11-16T10:21:07.797Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 7b542fc597e047c7df63bba12a3e77ef264bc2481b236fe1a0de1e3a8d252f92
semantic_inventory:
  - claim_key: CLAIM-965B97A9CEFFB691
    claim_text: The kb_search answer must take a requirement's reason from its rationale field, then its Why this changed section, then its Why, Rationale or Context section, then its linked ADR
    role: normative
    status: modeled
    span:
      start: 0
      end: 178
logic_claims:
  - CLAIM-965B97A9CEFFB691
id: REQ-search-answer-reason-source-order
type: req
---
The kb_search answer must take a requirement's reason from its rationale field, then its Why this changed section, then its Why, Rationale or Context section, then its linked ADR.

## Context

The rationale field and the Why this changed section are written for the current rule; a Context section and an ADR can explain an earlier version or a wider decision. Taking the most specific record first keeps the answer's reason the one that holds now, and requirement-rationale-missing reads the same records.

## Source

> Maintainer decision, 2026-11-16, approving the why-answer statements: "Approve all"