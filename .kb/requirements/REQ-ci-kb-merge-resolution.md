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
semantic_text: The Kibi KB merge workflow must build the merge driver from the base branch. The Kibi KB merge workflow must not install the pull request branch dependencies before merging. The Kibi KB merge workflow must run the proof gate before pushing a merge. When the proof gate fails, the Kibi KB merge workflow must not push the merge.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 359acfe7f0c6cbb30767d33f491bc691837d952959bb83efb55ed199044b4c00
semantic_inventory:
  - claim_key: CLAIM-F23EBD496387C5E3
    claim_text: The Kibi KB merge workflow must build the merge driver from the base branch
    role: normative
    span:
      start: 0
      end: 75
    status: modeled
  - claim_key: CLAIM-2EE353F4577820C0
    claim_text: The Kibi KB merge workflow must not install the pull request branch dependencies before merging
    role: normative
    span:
      start: 77
      end: 172
    status: modeled
  - claim_key: CLAIM-8948B0F74FEC41BA
    claim_text: The Kibi KB merge workflow must run the proof gate before pushing a merge
    role: normative
    span:
      start: 174
      end: 247
    status: modeled
  - claim_key: CLAIM-50B73DAECD56E5FB
    claim_text: When the proof gate fails, the Kibi KB merge workflow must not push the merge
    role: condition
    span:
      start: 249
      end: 326
    status: modeled
logic_claims:
  - CLAIM-F23EBD496387C5E3
  - CLAIM-2EE353F4577820C0
  - CLAIM-8948B0F74FEC41BA
  - CLAIM-50B73DAECD56E5FB
id: REQ-ci-kb-merge-resolution
type: req
origin:
  kind: human
  ref: 'Maintainer decision, 2026-10-24, approving the formal-proof design phase that replaces proof/baseline.json with evidence floors: "I''d like to do all the remaining phases."'
  recorded_at: '2026-10-24T09:00:00.000Z'
---
The Kibi KB merge workflow must build the merge driver from the base branch. The Kibi KB merge workflow must not install the pull request branch dependencies before merging. The Kibi KB merge workflow must run the proof gate before pushing a merge. When the proof gate fails, the Kibi KB merge workflow must not push the merge.

## Context

The workflow builds Kibi from the base branch and checks the pull request out beside it, so a branch made before `kibi merge-driver` existed still merges and its stale lockfile is never installed; a lockfile that no longer matches the merged manifests is refreshed in the merge commit. Before pushing, it runs `scripts/proof-gate.sh`, the same evidence-floor gate as the proof workflow and the pre-push hook.

## Why this changed

The merge workflow used to recompute the summary counts of proof/baseline.json and run the baseline check, because two branches that each added a requirement conflicted in that file. Evidence floors replaced the baseline file, so there are no counts to reconcile, and the gate the workflow runs is now the evidence-floor check.
