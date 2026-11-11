---
title: Normal sync compiles only changed sources into journaled transactions
status: open
semantic_text: Normal sync MUST compile only changed source entities relationship shards and deletions into journaled transactions while sync --rebuild is the only generation-replacement path and idle compaction is available.
semantic_clauses:
  - Normal sync MUST compile only changed source entities relationship shards and deletions into journaled transactions while sync --rebuild is the only generation-replacement path and idle compaction is available
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0f580228d2ba334157d1866dc67f3829fcad1b539ace94a9b7d03bcc21f6156c
semantic_inventory:
  - claim_key: CLAIM-A7612F59AFB9BF9A
    claim_text: Normal sync MUST compile only changed source entities relationship shards and deletions into journaled transactions while sync --rebuild is the only generation-replacement path and idle compaction is available
    role: normative
    status: modeled
    span:
      start: 0
      end: 209
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-A7612F59AFB9BF9A
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T07:27:33.240Z'
priority: must
tags:
  - core
  - engine
  - sync
  - persistence
firmness: firm
id: REQ-kibi-sync-delta-compilation
type: req
---
Normal sync MUST compile only changed source entities relationship shards and deletions into journaled transactions while sync --rebuild is the only generation-replacement path and idle compaction is available.

## Context

Delta compilation keeps sync fast on large KBs, and keeping generation replacement behind --rebuild means a routine sync never discards the active journal.

The engine is the only writer of a branch store, so a second writer, a partial commit, an unchecked migration or a silent full recompile would each lose or corrupt KB state that every later check relies on.

## Why this changed

Split from REQ-core-journaled-engine-persistence, which held four behaviors: one single-writer engine reached through the framed protocol, durable RDF transactions, guarded legacy migration, and delta compilation on normal sync. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
