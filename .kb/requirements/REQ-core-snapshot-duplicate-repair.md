---
title: Attaching a store with duplicate triples repairs and reports it
status: open
priority: must
required_evidence: tested
tags:
  - core
  - persistence
  - rdf
origin:
  kind: agent
  ref: 'Proof job store-integrity investigation: matrix samples on develop and on PR trees failed the search evals and strict-fact-shape because a fresh load of the branch store held triples twice.'
  approved_by: maintainer
  recorded_at: '2026-11-17T09:10:08.037Z'
rationale: Releases before this fix wrote such snapshots, so stores on users' disks can already hold duplicates. A repair that only fixed them silently would hide that answers given before it may have been wrong.
semantic_text: When an engine attaches a branch store whose snapshot holds a triple more than once, it must keep one copy of each such triple, rewrite the snapshot, report the repair on stderr, and record it so that kb_status lists it as a notice and kibi doctor shows the Branch store check as a warning for seven days after the repair.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 6b5da5b652239d2e7a24c0fe858e566b71b4e3d366fe761601c627372823d624
semantic_inventory:
  - claim_key: CLAIM-FEBCBF96DE6C4A64
    claim_text: When an engine attaches a branch store whose snapshot holds a triple more than once, it must keep one copy of each such triple, rewrite the snapshot, report the repair on stderr, and record it so that kb_status lists it as a notice and kibi doctor shows the Branch store check as a warning for seven days after the repair
    role: condition
    status: modeled
    span:
      start: 0
      end: 321
logic_claims:
  - CLAIM-FEBCBF96DE6C4A64
id: REQ-core-snapshot-duplicate-repair
type: req
---
When an engine attaches a branch store whose snapshot holds a triple more than once, it must keep one copy of each such triple, rewrite the snapshot, report the repair on stderr, and record it so that kb_status lists it as a notice and kibi doctor shows the Branch store check as a warning for seven days after the repair.

## Context

Releases before this fix wrote such snapshots, so stores on users' disks can already hold duplicates. A repair that only fixed them silently would hide that answers given before it may have been wrong.

## Source

> Proof job store-integrity investigation: matrix samples on develop and on PR trees failed the search evals and strict-fact-shape because a fresh load of the branch store held triples twice.
