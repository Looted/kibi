---
title: Source authoring writes only into authored .kb lanes
status: open
semantic_text: kb_upsert source authoring must write markdown entities into the matching canonical .kb lane and symbols into .kb/symbols.yaml. document.path may target authored .kb knowledge lanes and must reject derived .kb trees including branches, recovery, verification, briefs, and migrations. createRepoIgnorePolicy must hard-deny derived .kb runtime trees including .kb/migrations and must not ignore authored knowledge lanes.
semantic_clauses:
  - kb_upsert source authoring must write markdown entities into the matching canonical .kb lane and symbols into .kb/symbols.yaml
  - document.path may target authored .kb knowledge lanes and must reject derived .kb trees including branches, recovery, verification, briefs, and migrations
  - createRepoIgnorePolicy must hard-deny derived .kb runtime trees including .kb/migrations and must not ignore authored knowledge lanes
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: b756fdaac6397b18ce1050c1c0df82c424aef4546bf0cc395bdf0e91b971a40d
semantic_inventory:
  - claim_key: CLAIM-FDB2F593DE25BF3A
    claim_text: kb_upsert source authoring must write markdown entities into the matching canonical .kb lane and symbols into .kb/symbols.yaml
    role: normative
    status: modeled
    span:
      start: 0
      end: 126
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-0B0734835B2F77AC
    claim_text: document.path may target authored .kb knowledge lanes and must reject derived .kb trees including branches, recovery, verification, briefs, and migrations
    role: normative
    status: modeled
    span:
      start: 128
      end: 282
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-B842BEFAEC1A9D00
    claim_text: createRepoIgnorePolicy must hard-deny derived .kb runtime trees including .kb/migrations and must not ignore authored knowledge lanes
    role: normative
    status: modeled
    span:
      start: 284
      end: 417
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-FDB2F593DE25BF3A
  - CLAIM-0B0734835B2F77AC
  - CLAIM-B842BEFAEC1A9D00
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T05:15:46.264Z'
priority: must
tags:
  - cli
  - sync
  - canonical-layout
firmness: firm
id: REQ-kibi-canonical-source-authoring
type: req
---
kb_upsert source authoring must write markdown entities into the matching canonical .kb lane and symbols into .kb/symbols.yaml. document.path may target authored .kb knowledge lanes and must reject derived .kb trees including branches, recovery, verification, briefs, and migrations. createRepoIgnorePolicy must hard-deny derived .kb runtime trees including .kb/migrations and must not ignore authored knowledge lanes.

## Context

Authored knowledge and derived runtime state never mix, so a write can never land in a store that sync later rebuilds or discards.

ADR-026 fixes the canonical .kb/ project contract. Scaffolding itself remains REQ-cli-init-canonical.

## Why this changed

Split from REQ-cli-canonical-runtime, which held three behaviors: sync discovery of the canonical knowledge lanes, canonical source authoring with the derived-tree ignore policy, and the manifest as the initialized project signal. Each child is one of them. Symbol coordinate refresh, staged file listing and legacy storage migration moved to the requirements that decide them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
