---
id: REQ-cli-sync
title: Import entities from source files into the branch KB
status: open
created_at: 2026-05-13T10:00:00.000Z
updated_at: 2026-05-13T10:00:00.000Z
source: REQ-003
priority: must
tags:
  - cli
  - sync
links:
  - type: supersedes
    target: REQ-003
  - type: specified_by
    target: SCEN-007
  - type: specified_by
    target: SCEN-012
  - type: verified_by
    target: TEST-002
  - type: verified_by
    target: TEST-015
semantic_text: The `kibi sync` command performs a full import of entities from the local filesystem into the branch-specific KB. It discovers files matching patterns in `config.json`, extracts Markdown and YAML metadata. resolves branch state, and upserts the results into the Prolog KB.
semantic_clauses:
  - The `kibi sync` command performs a full import of entities from the local filesystem into the branch-specific KB
  - It discovers files matching patterns in `config.json`, extracts Markdown and YAML metadata
  - resolves branch state, and upserts the results into the Prolog KB
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 434a742aa1656d9b0c9e13cca9ca3d2d7b0f2d867b8a266efb6bd4ceb94e0cf5
logic_claims:
  - CLAIM-4CBB83DF1A5C9FD6
  - CLAIM-ECE860D65D9E1B09
  - CLAIM-213E7367DE1640EE
semantic_inventory:
  - claim_key: CLAIM-4CBB83DF1A5C9FD6
    claim_text: The `kibi sync` command performs a full import of entities from the local filesystem into the branch-specific KB
    role: descriptive
    status: modeled
    span:
      start: 0
      end: 112
    payload_hash: fd856c826575a3e48b6863e3523cd7aafc99854831fb70cbc99feb780499f7d2
    reason: Grounded through the advisor-selected strict fact or approved project-local predicate schema.
  - claim_key: CLAIM-ECE860D65D9E1B09
    claim_text: It discovers files matching patterns in `config.json`, extracts Markdown and YAML metadata
    role: descriptive
    status: modeled
    span:
      start: 114
      end: 204
    payload_hash: fd856c826575a3e48b6863e3523cd7aafc99854831fb70cbc99feb780499f7d2
    reason: Grounded through the advisor-selected strict fact or approved project-local predicate schema.
  - claim_key: CLAIM-213E7367DE1640EE
    claim_text: resolves branch state, and upserts the results into the Prolog KB
    role: descriptive
    status: modeled
    span:
      start: 206
      end: 271
    payload_hash: fd856c826575a3e48b6863e3523cd7aafc99854831fb70cbc99feb780499f7d2
    reason: Grounded through the advisor-selected strict fact or approved project-local predicate schema.
type: req
---

The `kibi sync` command performs a full import of entities from the local filesystem into the branch-specific KB.
It discovers files matching patterns in `config.json`, extracts Markdown and YAML metadata,
resolves branch state, and upserts the results into the Prolog KB.
