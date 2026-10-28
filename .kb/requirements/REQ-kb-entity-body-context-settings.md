---
title: Entity body context settings
status: open
priority: must
firmness: firm
semantic_text: The entity types that must carry body context shall be req, scenario, test, adr and fact. The context section headings shall be context, rationale, why, background, source, notes and evidence. The minimum context section length shall be 12 words. The context restatement threshold shall be a Jaccard similarity of 0.8.
semantic_clauses:
  - The entity types that must carry body context shall be req, scenario, test, adr and fact.
  - The context section headings shall be context, rationale, why, background, source, notes and evidence.
  - The minimum context section length shall be 12 words.
  - The context restatement threshold shall be a Jaccard similarity of 0.8.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T10:38:06.174Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 1d4fd079db790f9b52fa19853f4f2a33bc920df039fe9e33329d1393a86d9162
semantic_inventory:
  - claim_key: CLAIM-F79D10EECC5C5800
    claim_text: The entity types that must carry body context shall be req, scenario, test, adr and fact
    role: normative
    status: modeled
    span:
      start: 0
      end: 88
  - claim_key: CLAIM-07E2F041C92FF4E3
    claim_text: The context section headings shall be context, rationale, why, background, source, notes and evidence
    role: normative
    status: modeled
    span:
      start: 90
      end: 191
  - claim_key: CLAIM-3AE5FD48C8040C7C
    claim_text: The minimum context section length shall be 12 words
    role: normative
    status: modeled
    span:
      start: 193
      end: 245
  - claim_key: CLAIM-1D3F76DD5F69F22E
    claim_text: The context restatement threshold shall be a Jaccard similarity of 0.8
    role: normative
    status: modeled
    span:
      start: 247
      end: 317
logic_claims:
  - CLAIM-F79D10EECC5C5800
  - CLAIM-07E2F041C92FF4E3
  - CLAIM-3AE5FD48C8040C7C
  - CLAIM-1D3F76DD5F69F22E
id: REQ-kb-entity-body-context-settings
type: req
---
The entity types that must carry body context shall be req, scenario, test, adr and fact. The context section headings shall be context, rationale, why, background, source, notes and evidence. The minimum context section length shall be 12 words. The context restatement threshold shall be a Jaccard similarity of 0.8.

## Context

packages/cli/src/entity-body-context.ts is the one place that decides what body text counts as context for REQ-kb-entity-body-context: the entity types that must carry it, the headings whose sections hold it, the minimum length of a context section and the Jaccard similarity at which a section only restates the statement. They are stated here so each is proved against the constant; how the check reports a missing context stays in REQ-kb-entity-body-context.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"