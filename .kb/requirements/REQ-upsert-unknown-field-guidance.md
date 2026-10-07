---
title: Upsert validation names unknown fields and where prose belongs
status: open
priority: must
tags:
  - upsert
  - validation
  - skills
semantic_text: The upsert validation error must name every unknown entity property. The upsert validation error must direct entity prose placed in properties to the document body. The bootstrap skill scenario example must be a valid upsert with a context-bearing document body.
semantic_clauses:
  - The upsert validation error must name every unknown entity property.
  - The upsert validation error must direct entity prose placed in properties to the document body.
  - The bootstrap skill scenario example must be a valid upsert with a context-bearing document body.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 06e537859f0d5f7bfb9d5de4f357e072ef580e2781d65e1fadfdd1aabf1b3b8c
semantic_inventory:
  - claim_key: CLAIM-209246E615EFD4EA
    claim_text: The upsert validation error must name every unknown entity property
    role: normative
    status: modeled
    span:
      start: 0
      end: 67
  - claim_key: CLAIM-EFD7218E1F54974F
    claim_text: The upsert validation error must direct entity prose placed in properties to the document body
    role: normative
    status: modeled
    span:
      start: 69
      end: 163
  - claim_key: CLAIM-C62090C3F4B5F4C6
    claim_text: The bootstrap skill scenario example must be a valid upsert with a context-bearing document body
    role: normative
    status: modeled
    span:
      start: 165
      end: 261
logic_claims:
  - CLAIM-209246E615EFD4EA
  - CLAIM-EFD7218E1F54974F
  - CLAIM-C62090C3F4B5F4C6
origin:
  kind: agent
  recorded_at: '2026-10-07T12:28:24.052Z'
id: REQ-upsert-unknown-field-guidance
type: req
---
The upsert validation error must name every unknown entity property. The upsert validation error must direct entity prose placed in properties to the document body. The bootstrap skill scenario example must be a valid upsert with a context-bearing document body.

## Context
In an external onboarding evaluation 95 scenario upserts failed with 'Entity validation failed: root: must NOT have additional properties' because the agent put the scenario text in a body property. The message named no field, and the kibi-bootstrap scenario example had no document body even though schema 8 requires context in scenario bodies, so the agent found document.body only after 95 failed calls. Piotr asked for the error to name the field and for the skill example to be valid.

## Source
> Komunikat nie podaje nazwy nadmiarowego pola ani podpowiedzi.

Onboarding evaluation of Kibi 2.7.0 and kibi-mcp 3.2.0 in a test project, round 4 analysis (2026-10-07), finding K4.
