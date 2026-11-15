---
title: Plan apply migrates an attached legacy branch store first, under its approved preview
status: open
priority: must
required_evidence: tested
semantic_text: While a legacy literal-path branch store is attached, kb_apply_plan must apply only a migration plan that approves that branch's same-identity legacy migration. kb_apply_plan must run the approved legacy migration before the plan's other approved actions. A legacy migration whose store changed after its migration preview must be refused.
tags:
  - git
  - branching
  - storage
  - migration
  - mcp
origin:
  kind: agent
  recorded_at: '2026-11-14T12:00:00.000Z'
  ref: 'Maintainer, in review on 2026-11-15: approved this requirement statement as written.'
  approved_by: maintainer
semantic_clauses:
  - While a legacy literal-path branch store is attached, kb_apply_plan must apply only a migration plan that approves that branch's same-identity legacy migration.
  - kb_apply_plan must run the approved legacy migration before the plan's other approved actions.
  - A legacy migration whose store changed after its migration preview must be refused.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 16dca7c8124ed27f94933f9e2760d2d745f82d4bf62ebf563a90a424c62e5ee7
semantic_inventory:
  - claim_key: CLAIM-EDC0785B76B7973D
    claim_text: While a legacy literal-path branch store is attached, kb_apply_plan must apply only a migration plan that approves that branch's same-identity legacy migration
    role: normative
    status: modeled
    span:
      start: 0
      end: 159
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-20BBB71C30D9EC47
    claim_text: kb_apply_plan must run the approved legacy migration before the plan's other approved actions
    role: normative
    status: modeled
    span:
      start: 161
      end: 254
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-90C91E1328E73D73
    claim_text: A legacy migration whose store changed after its migration preview must be refused
    role: normative
    status: modeled
    span:
      start: 256
      end: 338
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-EDC0785B76B7973D
  - CLAIM-20BBB71C30D9EC47
  - CLAIM-90C91E1328E73D73
id: REQ-kibi-legacy-attachment-apply-migration
type: req
---
While a legacy literal-path branch store is attached, kb_apply_plan must apply only a migration plan that approves that branch's same-identity legacy migration. kb_apply_plan must run the approved legacy migration before the plan's other approved actions. A legacy migration whose store changed after its migration preview must be refused.

## Context

A project upgraded from an older Kibi still attaches its branch store at the old literal path. kb_status previews a legacy migration action for it, but applying that plan through kb_apply_plan never worked: the MCP server refused every engine-backed tool while the legacy store was attached, and the plan's migration action did not carry the approval hash that `kibi branch migrate --apply` requires. The plan now binds the migration preview's hash, plan apply runs the legacy migration before anything that reads the store, and a plan that leaves the migration out is refused instead of writing to the old store.

## Source

> Maintainer, in review on 2026-11-15: approved this requirement statement as written.