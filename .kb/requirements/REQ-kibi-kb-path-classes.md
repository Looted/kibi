---
title: Kibi classifies .kb paths as authored knowledge lanes, derived runtime trees or neither, and refuses authored writes into derived trees
status: open
semantic_text: Kibi must classify each .kb path as an authored knowledge lane, a derived runtime tree or neither. Agents must not author derived trees.
semantic_clauses:
  - Kibi must classify each .kb path as an authored knowledge lane, a derived runtime tree or neither
  - Agents must not author derived trees
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: effbfbf96be0245649a5f16dc4f226f5b61bee1994ef0b422d0f1bb6b5aa5c40
semantic_inventory:
  - claim_key: CLAIM-8391A5AFE823E6FF
    claim_text: Kibi must classify each .kb path as an authored knowledge lane, a derived runtime tree or neither
    role: normative
    status: modeled
    span:
      start: 0
      end: 97
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-FB07868CB2C70FE4
    claim_text: Agents must not author derived trees
    role: normative
    status: modeled
    span:
      start: 99
      end: 135
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-8391A5AFE823E6FF
  - CLAIM-FB07868CB2C70FE4
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the new-sentence children of the single-surface requirements in the KB gold-standard review (split batch 5): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T10:56:03.073Z'
firmness: firm
required_evidence: tested
priority: must
tags:
  - kb-layout
  - init
id: REQ-kibi-kb-path-classes
type: req
---
Kibi must classify each .kb path as an authored knowledge lane, a derived runtime tree or neither. Agents must not author derived trees.

## Context

Entity lanes and the symbols manifest and coordinates are tracked knowledge; .kb/branches, .kb/recovery, .kb/proof/runs, .kb/briefs and .kb/migrations are derived runtime state that Kibi rebuilds. Upsert refuses a document.path inside a derived tree with SOURCE_PATH_INVALID, the ignore policy and apply plans skip them, so an agent can never hand-edit state that the next sync would overwrite.

Carved out of REQ-cli-init-canonical, which keeps what kibi init writes; this child names how every later command tells authored knowledge from derived state under .kb/.

## Source

> Maintainer decision, 2026-11-05, approving the new-sentence children of the single-surface requirements in the KB gold-standard review (split batch 5): "ok"
