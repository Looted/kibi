---
title: Symbol coordinates are a local cache derived from source, never committed
status: open
priority: must
required_evidence: tested
firmness: firm
tags:
  - symbols
  - coordinates
  - sync
  - staged
  - migration
rationale: Every committed coordinate record carried a whole-file source hash, so two branches that touched the same source file always conflicted on .kb/symbol-coordinates.yaml.
origin:
  kind: human
  ref: 'Maintainer decision, 2026-10-27: gitignore symbol-coordinates.yaml and derive it at sync and check time'
  recorded_at: '2026-10-27T00:00:00.000Z'
semantic_text: kibi init must add .kb/symbol-coordinates.yaml to the repository gitignore. Every kibi sync must refresh the symbol coordinate cache from source, re-extract only symbols whose source or identity changed, and leave .kb/symbols.yaml unchanged. The staged check must judge symbol evidence by the declaration titles in the staged .kb/symbols.yaml and never by symbol coordinates. kibi check-generated must reject a staged index that contains .kb/symbol-coordinates.yaml. kibi migrate to schema 13 must add .kb/symbol-coordinates.yaml to the gitignore and remove it from the Git index while keeping the local file.
semantic_clauses:
  - kibi init must add .kb/symbol-coordinates.yaml to the repository gitignore.
  - Every kibi sync must refresh the symbol coordinate cache from source, re-extract only symbols whose source or identity changed, and leave .kb/symbols.yaml unchanged.
  - The staged check must judge symbol evidence by the declaration titles in the staged .kb/symbols.yaml and never by symbol coordinates.
  - kibi check-generated must reject a staged index that contains .kb/symbol-coordinates.yaml.
  - kibi migrate to schema 13 must add .kb/symbol-coordinates.yaml to the gitignore and remove it from the Git index while keeping the local file.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 201c86e5ee4e66d300d6ecf7402f47dd6a2cf6eda6a2e9b0c36ce755586f792c
logic_claims:
  - CLAIM-C2BE8C03A5BBDCC4
  - CLAIM-0589415A2EA2207F
  - CLAIM-7552E258E3BBE532
  - CLAIM-B830D36F58154DE7
  - CLAIM-EEAAB35A1D76261C
semantic_inventory:
  - claim_key: CLAIM-C2BE8C03A5BBDCC4
    claim_text: kibi init must add .kb/symbol-coordinates.yaml to the repository gitignore
    role: normative
    status: modeled
    span:
      start: 0
      end: 74
  - claim_key: CLAIM-0589415A2EA2207F
    claim_text: Every kibi sync must refresh the symbol coordinate cache from source, re-extract only symbols whose source or identity changed, and leave .kb/symbols.yaml unchanged
    role: normative
    status: modeled
    span:
      start: 76
      end: 240
  - claim_key: CLAIM-7552E258E3BBE532
    claim_text: The staged check must judge symbol evidence by the declaration titles in the staged .kb/symbols.yaml and never by symbol coordinates
    role: normative
    status: modeled
    span:
      start: 242
      end: 374
  - claim_key: CLAIM-B830D36F58154DE7
    claim_text: kibi check-generated must reject a staged index that contains .kb/symbol-coordinates.yaml
    role: normative
    status: modeled
    span:
      start: 376
      end: 465
  - claim_key: CLAIM-EEAAB35A1D76261C
    claim_text: kibi migrate to schema 13 must add .kb/symbol-coordinates.yaml to the gitignore and remove it from the Git index while keeping the local file
    role: normative
    status: modeled
    span:
      start: 467
      end: 608
id: REQ-symbol-coordinates-derived-locally
type: req
---
kibi init must add .kb/symbol-coordinates.yaml to the repository gitignore. Every kibi sync must refresh the symbol coordinate cache from source, re-extract only symbols whose source or identity changed, and leave .kb/symbols.yaml unchanged. The staged check must judge symbol evidence by the declaration titles in the staged .kb/symbols.yaml and never by symbol coordinates. kibi check-generated must reject a staged index that contains .kb/symbol-coordinates.yaml. kibi migrate to schema 13 must add .kb/symbol-coordinates.yaml to the gitignore and remove it from the Git index while keeping the local file.

## Context

Parallel branches kept conflicting on `.kb/symbol-coordinates.yaml`. Each coordinate record carried a hash of its whole source file, so any two branches that edited the same source file changed the same records, even when they touched different declarations. The KB merge workflow resolved these conflicts only after a push to the default branch, and the local merge driver was never configured, so contributors met the conflict on every rebase. The maintainer asked for the coordinates to stop causing conflicts on new work and chose to derive them locally at sync and check time instead of committing them.

## Source

> Can we somehow refactor symbol cooridnates so new work does not always result in a conflict?

Chosen option: gitignore the coordinates file and derive it at sync and check time.
