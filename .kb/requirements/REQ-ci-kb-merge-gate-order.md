---
title: The KB merge workflow runs the proof gate before it pushes
status: open
priority: should
firmness: default
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
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?" Firmness relabelled to default until reviewed. Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested."'
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
required_evidence: tested
---
The Kibi KB merge workflow must run the proof gate before pushing a merge.

## Context

The resolve job of .github/workflows/kb-merge.yml runs the Kibi KB merge action with `sh scripts/proof-gate.sh` as its `check`; the action runs the check on the merged tree after `kibi sync` and pushes the merge only when it passed (REQ-kb-merge-action-verify-before-push). This claim was split from REQ-ci-kb-merge-resolution and was proved against the workflow's step order while the workflow pushed in its own step; since the push moved into the action, scripts/tests/kb-merge-resolution.test.ts tests it by running the action with Kibi's proof gate against a scratch remote.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"