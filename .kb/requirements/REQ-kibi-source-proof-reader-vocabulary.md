---
title: Source proof reader vocabulary
status: open
priority: should
firmness: firm
semantic_text: Source proof readers must be one of json, yaml, glob, openapi, references, schema, routes or validator.
semantic_clauses:
  - Source proof readers must be one of json, yaml, glob, openapi, references, schema, routes or validator.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T13:41:01.783Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: e368c1d199dc90ad086ff91de3a820e61ff5d679bb4a827503d85eb6a399518c
semantic_inventory:
  - claim_key: CLAIM-80131AF672B06C75
    claim_text: Source proof readers must be one of json, yaml, glob, openapi, references, schema, routes or validator
    role: normative
    status: modeled
    span:
      start: 0
      end: 102
logic_claims:
  - CLAIM-80131AF672B06C75
id: REQ-kibi-source-proof-reader-vocabulary
type: req
---
Source proof readers must be one of json, yaml, glob, openapi, references, schema, routes or validator.

## Context

REQ-kibi-source-proof-kinds lets a source proof read project files through a closed set of readers. The entity schema lists those readers, and a source certificate reads the list back from the schema itself.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"