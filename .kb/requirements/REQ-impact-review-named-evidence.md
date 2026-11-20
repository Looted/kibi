---
title: Impact-review preparation returns full evidence only for named paths
status: open
priority: must
required_evidence: tested
semantic_text: Kibi must return a file's complete evidence only for the paths the call names.
tags:
  - impact-policy
  - public-preparation
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-19, approving these statements as worded and the staged scope first, after kb_prepare_impact_review returned about 16,000 fixed characters plus about 4,000 per file and repeated each requirement for every file that names it: "Yes, please."'
  recorded_at: '2026-11-19T21:00:00.000Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 04708b33183a118392934b8f3237b6222bf7c1bcce4eb8c50675e901bc6e8644
semantic_inventory:
  - claim_key: CLAIM-1B678C1FBAF20CB4
    claim_text: Kibi must return a file's complete evidence only for the paths the call names
    role: normative
    status: modeled
    span:
      start: 0
      end: 77
logic_claims:
  - CLAIM-1B678C1FBAF20CB4
rationale: Full per-file evidence and requirement context cost about 4,000 characters a file, and a reviewer reads them for the few files it decides with care; returning them for every file pushed the preparation past every host's result budget.
id: REQ-impact-review-named-evidence
type: req
---
Kibi must return a file's complete evidence only for the paths the call names.

## Why

Full per-file evidence and requirement context cost about 4,000 characters a file, and a reviewer reads them for the few files it decides with care; returning them for every file pushed the preparation past every host's result budget.

## Context

namedEvidence returns the file's hunks, both sides' analysis and each scoped requirement's statement, relationships and related entities for the paths in paths; a path outside the captured inventory is refused.

## Source

> Maintainer decision, 2026-11-19, approving this statement as worded.
