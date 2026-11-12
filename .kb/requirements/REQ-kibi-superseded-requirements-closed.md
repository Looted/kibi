---
title: Superseded requirements are closed, and supersession cycles are reported once
status: open
semantic_text: kb_check must report a requirement that another requirement supersedes and that is not closed as a blocking superseded-requirement-open violation. kb_check must report each supersession cycle once, naming every member, without reporting its members again as open. kibi migrate must plan an automatic action that changes only the status line of an open superseded requirement to closed. kibi migrate must leave supersession cycles as review actions.
semantic_clauses:
  - kb_check must report a requirement that another requirement supersedes and that is not closed as a blocking superseded-requirement-open violation.
  - kb_check must report each supersession cycle once, naming every member, without reporting its members again as open.
  - kibi migrate must plan an automatic action that changes only the status line of an open superseded requirement to closed.
  - kibi migrate must leave supersession cycles as review actions.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: b551101b4f59270254344aac165c0e9a15eba4cad2f27643276ff0f534882f44
semantic_inventory:
  - claim_key: CLAIM-2008EB7A5331AA76
    claim_text: kb_check must report a requirement that another requirement supersedes and that is not closed as a blocking superseded-requirement-open violation
    role: normative
    status: modeled
    span:
      start: 0
      end: 145
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-5477F33D482A3C02
    claim_text: kb_check must report each supersession cycle once, naming every member, without reporting its members again as open
    role: normative
    status: modeled
    span:
      start: 147
      end: 262
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-23CF2F42184248A2
    claim_text: kibi migrate must plan an automatic action that changes only the status line of an open superseded requirement to closed
    role: normative
    status: modeled
    span:
      start: 264
      end: 384
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-808222E9A0848A36
    claim_text: kibi migrate must leave supersession cycles as review actions
    role: normative
    status: modeled
    span:
      start: 386
      end: 447
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-2008EB7A5331AA76
  - CLAIM-5477F33D482A3C02
  - CLAIM-23CF2F42184248A2
  - CLAIM-808222E9A0848A36
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"'
  approved_by: maintainer
  recorded_at: '2026-11-04T18:19:16.353Z'
priority: must
required_evidence: tested
tags:
  - lifecycle
  - supersedes
  - source
  - migration
  - checks
  - schema-6
id: REQ-kibi-superseded-requirements-closed
type: req
---
kb_check must report a requirement that another requirement supersedes and that is not closed as a blocking superseded-requirement-open violation. kb_check must report each supersession cycle once, naming every member, without reporting its members again as open. kibi migrate must plan an automatic action that changes only the status line of an open superseded requirement to closed. kibi migrate must leave supersession cycles as review actions.

## Context

Supersession is how requirement semantics evolve append-only, so a superseded requirement that stays open reads as current, and a cycle leaves no current requirement at all.



## Why this changed

Split from REQ-kibi-kb-lifecycle-integrity, which held two behaviors: keeping superseded requirements closed and keeping authored sources resolvable. Each child covers how kb_check reports one of them and what kibi migrate repairs or leaves for review.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"
