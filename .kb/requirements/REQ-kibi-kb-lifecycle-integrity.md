---
title: Superseded requirements are closed, authored sources resolve, and migration repairs what it safely can
status: open
priority: must
tags:
  - lifecycle
  - supersedes
  - source
  - migration
  - checks
  - schema-6
semantic_text: kb_check must report a requirement that another requirement supersedes and that is not closed as a blocking superseded-requirement-open violation. kb_check must report each supersession cycle once, naming every member, without reporting its members again as open. kb_check must report an authored source that is not an existing workspace path, an entity id, or an http(s) URL as a blocking source-path-dangling violation. kibi migrate must plan an automatic action that changes only the status line of an open superseded requirement to closed. kibi migrate must plan an automatic action that rewrites an authored source mapping to an existing .kb file and removes an authored source that names the entity's own file or resolves to nothing. kibi migrate must leave supersession cycles and source values it cannot edit safely as review actions.
semantic_clauses:
  - kb_check must report a requirement that another requirement supersedes and that is not closed as a blocking superseded-requirement-open violation.
  - kb_check must report each supersession cycle once, naming every member, without reporting its members again as open.
  - kb_check must report an authored source that is not an existing workspace path, an entity id, or an http(s) URL as a blocking source-path-dangling violation.
  - kibi migrate must plan an automatic action that changes only the status line of an open superseded requirement to closed.
  - kibi migrate must plan an automatic action that rewrites an authored source mapping to an existing .kb file and removes an authored source that names the entity's own file or resolves to nothing.
  - kibi migrate must leave supersession cycles and source values it cannot edit safely as review actions.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 7bf0799f33eec28c16ea31cd90208c1204792c3a2198387c6f4a6d74d455b704
semantic_inventory:
  - claim_key: CLAIM-2008EB7A5331AA76
    claim_text: kb_check must report a requirement that another requirement supersedes and that is not closed as a blocking superseded-requirement-open violation
    role: normative
    span:
      start: 0
      end: 145
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-5477F33D482A3C02
    claim_text: kb_check must report each supersession cycle once, naming every member, without reporting its members again as open
    role: normative
    span:
      start: 147
      end: 262
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-A7F1B7772049A2DE
    claim_text: kb_check must report an authored source that is not an existing workspace path, an entity id, or an http(s) URL as a blocking source-path-dangling violation
    role: normative
    span:
      start: 264
      end: 420
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-23CF2F42184248A2
    claim_text: kibi migrate must plan an automatic action that changes only the status line of an open superseded requirement to closed
    role: normative
    span:
      start: 422
      end: 542
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-E9C0918B16CC724C
    claim_text: kibi migrate must plan an automatic action that rewrites an authored source mapping to an existing .kb file and removes an authored source that names the entity's own file or resolves to nothing
    role: normative
    span:
      start: 544
      end: 738
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-672C86985C64E3A7
    claim_text: kibi migrate must leave supersession cycles and source values it cannot edit safely as review actions
    role: normative
    span:
      start: 740
      end: 841
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
logic_claims:
  - CLAIM-2008EB7A5331AA76
  - CLAIM-5477F33D482A3C02
  - CLAIM-A7F1B7772049A2DE
  - CLAIM-23CF2F42184248A2
  - CLAIM-E9C0918B16CC724C
  - CLAIM-672C86985C64E3A7
origin:
  kind: agent
  recorded_at: '2026-10-04T05:38:25.487Z'
id: REQ-kibi-kb-lifecycle-integrity
type: req
---
kb_check must report a requirement that another requirement supersedes and that is not closed as a blocking superseded-requirement-open violation. kb_check must report each supersession cycle once, naming every member, without reporting its members again as open. kb_check must report an authored source that is not an existing workspace path, an entity id, or an http(s) URL as a blocking source-path-dangling violation. kibi migrate must plan an automatic action that changes only the status line of an open superseded requirement to closed. kibi migrate must plan an automatic action that rewrites an authored source mapping to an existing .kb file and removes an authored source that names the entity's own file or resolves to nothing. kibi migrate must leave supersession cycles and source values it cannot edit safely as review actions.

## Rationale

Supersession is how requirement semantics evolve append-only, so a superseded requirement that stays open reads as current to every agent that finds it, and a supersession cycle leaves no current requirement at all. Authored `source` fields that name the entity's own file or nothing at all were the most common dead metadata in large KBs. Both checks block (changeset `kb-schema-6`), and `kibi migrate` repairs every case that has one safe answer, leaving cycles and values it cannot edit safely to a person.
