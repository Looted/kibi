---
title: Entities record who authored and approved them, and missing approvals stay visible
status: open
priority: must
tags:
  - origin
  - provenance
  - approval
  - schema-6
  - checks
semantic_text: Every entity type must accept an optional origin field with kind human, agent, migration, or import and optional ref, approved_by, and recorded_at fields. Kibi must reject an origin with an unknown kind or an unknown field before anything is written. kb_upsert and kb_apply_plan must record origin kind agent with the write time on a new entity written without an origin. An update without an origin must never change the stored origin. A supplied origin must be stored as given, with the write time filled in when recorded_at is missing. kb_check must report exceptions without approved_by, agent-recorded exception approvals without corroboration, and agent-authored current requirements without origin.approved_by as non-blocking quality diagnostics.
semantic_clauses:
  - Every entity type must accept an optional origin field with kind human, agent, migration, or import and optional ref, approved_by, and recorded_at fields.
  - Kibi must reject an origin with an unknown kind or an unknown field before anything is written.
  - kb_upsert and kb_apply_plan must record origin kind agent with the write time on a new entity written without an origin.
  - An update without an origin must never change the stored origin.
  - A supplied origin must be stored as given, with the write time filled in when recorded_at is missing.
  - kb_check must report exceptions without approved_by, agent-recorded exception approvals without corroboration, and agent-authored current requirements without origin.approved_by as non-blocking quality diagnostics.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: b16bb3f40dbb78d9eba4f3b6fbf4d62875e6a8430de7afa17c3fdac2b5d439b2
semantic_inventory:
  - claim_key: CLAIM-7AC3394BD0DCD7A9
    claim_text: Every entity type must accept an optional origin field with kind human, agent, migration, or import and optional ref, approved_by, and recorded_at fields
    role: normative
    span:
      start: 0
      end: 153
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-E77E686DE934A103
    claim_text: Kibi must reject an origin with an unknown kind or an unknown field before anything is written
    role: normative
    span:
      start: 155
      end: 249
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-F9D3A08022C90A69
    claim_text: kb_upsert and kb_apply_plan must record origin kind agent with the write time on a new entity written without an origin
    role: normative
    span:
      start: 251
      end: 370
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-396B38A84EC59888
    claim_text: An update without an origin must never change the stored origin
    role: normative
    span:
      start: 372
      end: 435
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-2C9DDA29F7F91522
    claim_text: A supplied origin must be stored as given, with the write time filled in when recorded_at is missing
    role: normative
    span:
      start: 437
      end: 537
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-5AE3601D25967B56
    claim_text: kb_check must report exceptions without approved_by, agent-recorded exception approvals without corroboration, and agent-authored current requirements without origin.approved_by as non-blocking quality diagnostics
    role: normative
    span:
      start: 539
      end: 752
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
logic_claims:
  - CLAIM-7AC3394BD0DCD7A9
  - CLAIM-E77E686DE934A103
  - CLAIM-F9D3A08022C90A69
  - CLAIM-396B38A84EC59888
  - CLAIM-2C9DDA29F7F91522
  - CLAIM-5AE3601D25967B56
origin:
  kind: agent
  recorded_at: '2026-10-04T02:21:35.276Z'
id: REQ-kibi-entity-origin
type: req
---
Every entity type must accept an optional origin field with kind human, agent, migration, or import and optional ref, approved_by, and recorded_at fields. Kibi must reject an origin with an unknown kind or an unknown field before anything is written. kb_upsert and kb_apply_plan must record origin kind agent with the write time on a new entity written without an origin. An update without an origin must never change the stored origin. A supplied origin must be stored as given, with the write time filled in when recorded_at is missing. kb_check must report exceptions without approved_by, agent-recorded exception approvals without corroboration, and agent-authored current requirements without origin.approved_by as non-blocking quality diagnostics.

## Rationale

Every entity can now record who wrote it and who approved it, and requirements an agent writes through `kb_upsert` are marked as agent-authored (changeset `kb-schema-6`). Kibi cannot verify a person's approval, so the advisory checks only make visible what is still waiting for one: exceptions nobody approved, exception approvals only an agent recorded, and agent-written requirements no person has reviewed.
