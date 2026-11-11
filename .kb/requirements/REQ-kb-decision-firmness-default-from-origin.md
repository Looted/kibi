---
title: A decision without firmness reads as firm unless an agent wrote it
status: open
semantic_text: Kibi must read a requirement or ADR without firmness as firm unless an agent wrote it.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 289c7540042ca9534f77fa31e5257be9d496c0726e190dedf113c78b620d7121
semantic_inventory:
  - claim_key: CLAIM-1467DF1EFF12FAAD
    claim_text: Kibi must read a requirement or ADR without firmness as firm unless an agent wrote it
    role: exception
    status: modeled
    span:
      start: 0
      end: 85
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-1467DF1EFF12FAAD
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 1): "Agree to all."'
  approved_by: maintainer
  recorded_at: '2026-11-04T14:57:50.724Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - kb
  - decisions
  - migration
id: REQ-kb-decision-firmness-default-from-origin
type: req
---
Kibi must read a requirement or ADR without firmness as firm unless an agent wrote it.

## Context

effectiveFirmness, firmnessIsImplicit and originKind in packages/cli/src/decision-firmness.ts read a decision's firmness from its origin.

When a project's rules were imported into Kibi without a firmness value, Kibi read them as default, delegated decisions. The usage skill let an agent supersede such a decision on its own evidence, so agents rewrote the rules instead of asking when a request conflicted with them. Two changes address it: the skill treats a conflicting request as a question whatever the rule's firmness, and the data treats a missing firmness on a decision a person wrote, imported or carried over as firm, with bootstrap and import writing firmness explicitly and a schema bump migrating existing knowledge bases.

Schema 10 records the supersedes that existed before the change in the manifest, so history does not block; a new replacement of such a decision must be firm and cite the person's words. kb_upsert still records a new entity without origin as the agent's own, so an agent's choices stay default.

## Why this changed

Split from REQ-kb-decision-firmness-from-origin by behavior: how an absent firmness reads, how replacing an origin-firm decision is reported, and how bootstrap records imported rules. Each child is owned by the functions that decide it, and keeps the parent's wording.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 1): "Agree to all."
