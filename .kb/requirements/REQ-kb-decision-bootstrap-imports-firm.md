---
title: Bootstrap records cited rules as firm imports
status: open
semantic_text: Kibi bootstrap must record a requirement planned from a cited intent claim or a normative documentation line as an import that is firm and cites the passage.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: f6b4a5f95b415939ac75485117d7a832391e2cdaa79863861c7b84f195ea6c9e
semantic_inventory:
  - claim_key: CLAIM-AA4A30B17E7F85FF
    claim_text: Kibi bootstrap must record a requirement planned from a cited intent claim or a normative documentation line as an import that is firm and cites the passage
    role: normative
    status: modeled
    span:
      start: 0
      end: 156
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-AA4A30B17E7F85FF
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 1): "Agree to all."'
  approved_by: maintainer
  recorded_at: '2026-11-04T14:59:16.969Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - kb
  - decisions
  - migration
id: REQ-kb-decision-bootstrap-imports-firm
type: req
---
Kibi bootstrap must record a requirement planned from a cited intent claim or a normative documentation line as an import that is firm and cites the passage.

## Context

asImportedRule in packages/cli/src/operations/bootstrap/candidate-helpers.ts marks a planned requirement as a firm import that cites its passage.

When a project's rules were imported into Kibi without a firmness value, Kibi read them as default, delegated decisions. The usage skill let an agent supersede such a decision on its own evidence, so agents rewrote the rules instead of asking when a request conflicted with them. Two changes address it: the skill treats a conflicting request as a question whatever the rule's firmness, and the data treats a missing firmness on a decision a person wrote, imported or carried over as firm, with bootstrap and import writing firmness explicitly and a schema bump migrating existing knowledge bases.

Schema 10 records the supersedes that existed before the change in the manifest, so history does not block; a new replacement of such a decision must be firm and cite the person's words. kb_upsert still records a new entity without origin as the agent's own, so an agent's choices stay default.

## Why this changed

Split from REQ-kb-decision-firmness-from-origin by behavior: how an absent firmness reads, how replacing an origin-firm decision is reported, and how bootstrap records imported rules. Each child is owned by the functions that decide it, and keeps the parent's wording.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 1): "Agree to all."
