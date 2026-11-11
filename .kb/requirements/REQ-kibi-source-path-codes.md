---
title: Source path check and repair codes
status: open
semantic_text: The dangling source path review code shall be review_source_path_dangling. The dangling source path check rule shall be source-path-dangling. The source path rewrite action id shall be source-path-rewrite. The source path rewrite code shall be source_path_rewrite.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c96e33ac32051bd51f4c59c682d9fb53f1ac628d3fab648c0762bbe2c6744f45
semantic_inventory:
  - claim_key: CLAIM-D5C09CC767D572F9
    claim_text: The dangling source path review code shall be review_source_path_dangling
    role: normative
    status: modeled
    span:
      start: 0
      end: 73
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-9573897FBAE210B4
    claim_text: The dangling source path check rule shall be source-path-dangling
    role: normative
    status: modeled
    span:
      start: 75
      end: 140
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-9FCD149FC09937EF
    claim_text: The source path rewrite action id shall be source-path-rewrite
    role: normative
    status: modeled
    span:
      start: 142
      end: 204
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-831D86A6F95FE733
    claim_text: The source path rewrite code shall be source_path_rewrite
    role: normative
    status: modeled
    span:
      start: 206
      end: 263
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-D5C09CC767D572F9
  - CLAIM-9573897FBAE210B4
  - CLAIM-9FCD149FC09937EF
  - CLAIM-831D86A6F95FE733
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"'
  approved_by: maintainer
  recorded_at: '2026-11-04T18:12:43.573Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - proof
id: REQ-kibi-source-path-codes
type: req
---
The dangling source path review code shall be review_source_path_dangling. The dangling source path check rule shall be source-path-dangling. The source path rewrite action id shall be source-path-rewrite. The source path rewrite code shall be source_path_rewrite.

## Context

These are the codes of the dangling source path check and of the repair kibi migrate plans for it.

kb_check reports lifecycle problems with stable codes an agent can act on: review codes for findings a person must judge and action ids and codes for repairs Kibi can apply. They are stated here so every code is proved against its constant.

## Why this changed

Split from REQ-kibi-lifecycle-check-codes, which held thirteen codes for three kinds of lifecycle action. Each child is the codes of one kind of action.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"
