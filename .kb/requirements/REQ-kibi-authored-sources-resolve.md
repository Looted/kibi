---
title: Authored sources resolve, and migration repairs the ones it safely can
status: open
semantic_text: kb_check must report an authored source that is not an existing workspace path, an entity id, or an http(s) URL as a blocking source-path-dangling violation. kibi migrate must plan an automatic action that rewrites an authored source mapping to an existing .kb file and removes an authored source that names the entity's own file or resolves to nothing. kibi migrate must leave source values it cannot edit safely as review actions.
semantic_clauses:
  - kb_check must report an authored source that is not an existing workspace path, an entity id, or an http(s) URL as a blocking source-path-dangling violation.
  - kibi migrate must plan an automatic action that rewrites an authored source mapping to an existing .kb file and removes an authored source that names the entity's own file or resolves to nothing.
  - kibi migrate must leave source values it cannot edit safely as review actions.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 7760d33b14663dd91b29169a9bc57592c6223d91ede7ee39b4a695653abe1a20
semantic_inventory:
  - claim_key: CLAIM-A7F1B7772049A2DE
    claim_text: kb_check must report an authored source that is not an existing workspace path, an entity id, or an http(s) URL as a blocking source-path-dangling violation
    role: normative
    status: modeled
    span:
      start: 0
      end: 156
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-E9C0918B16CC724C
    claim_text: kibi migrate must plan an automatic action that rewrites an authored source mapping to an existing .kb file and removes an authored source that names the entity's own file or resolves to nothing
    role: normative
    status: modeled
    span:
      start: 158
      end: 352
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-28CBCC4E659AB322
    claim_text: kibi migrate must leave source values it cannot edit safely as review actions
    role: normative
    status: modeled
    span:
      start: 354
      end: 431
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-A7F1B7772049A2DE
  - CLAIM-E9C0918B16CC724C
  - CLAIM-28CBCC4E659AB322
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"'
  approved_by: maintainer
  recorded_at: '2026-11-04T18:19:40.112Z'
priority: must
required_evidence: tested
tags:
  - lifecycle
  - supersedes
  - source
  - migration
  - checks
  - schema-6
id: REQ-kibi-authored-sources-resolve
type: req
---
kb_check must report an authored source that is not an existing workspace path, an entity id, or an http(s) URL as a blocking source-path-dangling violation. kibi migrate must plan an automatic action that rewrites an authored source mapping to an existing .kb file and removes an authored source that names the entity's own file or resolves to nothing. kibi migrate must leave source values it cannot edit safely as review actions.

## Context

Authored source fields that name the entity's own file or nothing at all were the most common dead metadata in large KBs.



## Why this changed

Split from REQ-kibi-kb-lifecycle-integrity, which held two behaviors: keeping superseded requirements closed and keeping authored sources resolvable. Each child covers how kb_check reports one of them and what kibi migrate repairs or leaves for review.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"
