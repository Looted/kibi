---
title: The KB merge workflow runs the proof gate before it pushes
status: open
priority: should
firmness: firm
semantic_text: The Kibi KB merge workflow must run the proof gate before pushing a merge.
semantic_clauses:
  - The Kibi KB merge workflow must run the proof gate before pushing a merge.
tags:
  - ci
  - merge
  - proof
  - kb
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T09:39:41.514Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 812f3c7bbcd5919d03b71acbf8fff3d97f2f75f44949bc2d7965e80d4c65994d
semantic_inventory:
  - claim_key: CLAIM-8948B0F74FEC41BA
    claim_text: The Kibi KB merge workflow must run the proof gate before pushing a merge
    role: normative
    status: modeled
    span:
      start: 0
      end: 73
logic_claims:
  - CLAIM-8948B0F74FEC41BA
id: REQ-ci-kb-merge-gate-order
type: req
---
The Kibi KB merge workflow must run the proof gate before pushing a merge.

## Context

The resolve job of .github/workflows/kb-merge.yml runs `sh scripts/proof-gate.sh` as its own step and pushes the merge in a later step; GitHub Actions stops a job at the first failing step, so the order of these two steps is what keeps a merge that fails the gate from being pushed. This claim was split from REQ-ci-kb-merge-resolution so it is proved against the workflow file itself; how the merge is built and what happens on a failed gate stay there.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"