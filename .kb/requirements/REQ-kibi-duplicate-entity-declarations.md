---
title: kb_check blocks an entity id that authored sources declare more than once
status: open
priority: must
firmness: firm
tags:
  - check
  - integrity
  - symbols
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05: "Yes, please." in reply to the proposal to fix two Kibi gaps found while setting up a test project (full kibi check accepts an entity id declared twice while kibi check --staged refuses every commit over it; kibi doctor asks for .gitattributes lines that are already present)'
  approved_by: maintainer
  recorded_at: '2026-11-05T11:47:15.583Z'
semantic_text: The kb_check operation must report a blocking violation that names the source files and titles of the declarations when authored Kibi sources declare one entity id more than once.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 192786f84f54aadb900adad7a2d51048c4bbc181f9e679eec1523b27a4f49edb
semantic_inventory:
  - claim_key: CLAIM-3D4659A939EA9AC1
    claim_text: The kb_check operation must report a blocking violation that names the source files and titles of the declarations when authored Kibi sources declare one entity id more than once
    role: normative
    status: modeled
    span:
      start: 0
      end: 178
logic_claims:
  - CLAIM-3D4659A939EA9AC1
id: REQ-kibi-duplicate-entity-declarations
type: req
---
The kb_check operation must report a blocking violation that names the source files and titles of the declarations when authored Kibi sources declare one entity id more than once.

The finding is reported under `source-relationship-parity` with evidence direction `duplicate_entity`, one finding per duplicated id with its declarations ordered by file. Its suggestion says how to keep one declaration: a `kb_upsert` of the id merges copies that differ only in their links; other copies are merged by hand, then `kibi sync` runs again.

## Context

In a test project, a line-based Git merge of two branches (without the Kibi merge driver) left `.kb/symbols.yaml` declaring one symbol twice with different titles. A full `kibi check` passed, because the compiled store keeps one entity per id, while `kibi check --staged` refused every commit with "Duplicate snapshot entities". CI therefore never caught the copy, and the pre-commit hook then blocked commits that had nothing to do with it. The maintainer approved fixing it.

## Source

> Yes, please.

(in reply to: "a full `kibi check` accepts a duplicate symbol id, but `check --staged` refuses every commit because of it, so CI never catches it. Want a Kibi PR for those?")