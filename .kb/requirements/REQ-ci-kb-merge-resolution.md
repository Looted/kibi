---
title: KB merge workflow resolves PRs with the base branch driver and a proof-checked merge
status: open
priority: should
tags:
  - ci
  - merge
  - proof
  - kb
  - review:context-missing
semantic_text: The Kibi KB merge workflow must build the merge driver from the base branch. The Kibi KB merge workflow must not install the pull request branch dependencies before merging. When the proof gate fails, the Kibi KB merge workflow must not push the merge.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a8c4b33519b1bfd3f3fbdf472f0312e7667eafc485160beacc27ea668c4f86c7
semantic_inventory:
  - claim_key: CLAIM-F23EBD496387C5E3
    claim_text: The Kibi KB merge workflow must build the merge driver from the base branch
    role: normative
    status: modeled
    span:
      start: 0
      end: 75
  - claim_key: CLAIM-2EE353F4577820C0
    claim_text: The Kibi KB merge workflow must not install the pull request branch dependencies before merging
    role: normative
    status: modeled
    span:
      start: 77
      end: 172
  - claim_key: CLAIM-50B73DAECD56E5FB
    claim_text: When the proof gate fails, the Kibi KB merge workflow must not push the merge
    role: condition
    status: modeled
    span:
      start: 174
      end: 251
logic_claims:
  - CLAIM-F23EBD496387C5E3
  - CLAIM-2EE353F4577820C0
  - CLAIM-50B73DAECD56E5FB
id: REQ-ci-kb-merge-resolution
type: req
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T09:39:38.707Z'
semantic_clauses:
  - The Kibi KB merge workflow must build the merge driver from the base branch.
  - The Kibi KB merge workflow must not install the pull request branch dependencies before merging.
  - When the proof gate fails, the Kibi KB merge workflow must not push the merge.
---
The Kibi KB merge workflow must build the merge driver from the base branch. The Kibi KB merge workflow must not install the pull request branch dependencies before merging. When the proof gate fails, the Kibi KB merge workflow must not push the merge.

## Context

The workflow builds Kibi from the base branch and checks the pull request out beside it, so a branch made before `kibi merge-driver` existed still merges and its stale lockfile is never installed; a lockfile that no longer matches the merged manifests is refreshed in the merge commit. Before pushing, it runs `scripts/proof-gate.sh`, the same evidence-floor gate as the proof workflow and the pre-push hook.

## Why this changed

The merge workflow used to recompute the summary counts of proof/baseline.json and run the baseline check, because two branches that each added a requirement conflicted in that file. Evidence floors replaced the baseline file, so there are no counts to reconcile, and the gate the workflow runs is now the evidence-floor check.
