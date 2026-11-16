---
title: A kb_upsert dry run lists the same sibling requirements
status: open
priority: must
required_evidence: tested
firmness: default
tags:
  - upsert
  - sibling-requirements
semantic_text: A kb_upsert dry run must list the same requirements without writing.
rationale: An agent that previews a change should learn about the other requirements before it writes, so it can bring them into the same change or ask the person first, rather than after the value has moved.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the statements for the stale and split facts plan: "Approve all"'
  approved_by: maintainer
  recorded_at: '2026-11-16T19:17:07.926Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 782b444db713ce3b88c7c84cc4f885d37597cdc56a4d36e3c7382292119b447b
semantic_inventory:
  - claim_key: CLAIM-708BD8B0F6D0EBFB
    claim_text: A kb_upsert dry run must list the same requirements without writing
    role: normative
    status: modeled
    span:
      start: 0
      end: 67
logic_claims:
  - CLAIM-708BD8B0F6D0EBFB
id: REQ-upsert-dry-run-lists-siblings
type: req
---
A kb_upsert dry run must list the same requirements without writing.

## Context

An agent that previews a change should learn about the other requirements before it writes, so it can bring them into the same change or ask the person first, rather than after the value has moved.

## Source

> Maintainer decision, 2026-11-16, approving the statements for the stale and split facts plan: "Approve all"