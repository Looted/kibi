---
title: Member check reuse accepts only an identical attested git tree
status: passing
tags:
  - ci
  - merge-train
origin:
  kind: agent
  ref: scripts/tests/ci-check-reuse.test.ts
  recorded_at: '2026-11-24T15:25:27.762Z'
verification_scope: unit
verification_perspective: internal
id: TEST-ci-merge-train-member-reuse
type: test
---
scripts/tests/ci-check-reuse.test.ts decides reuse from the train commit, the member commit, and the checkout tree. It reuses only when those trees match and the member's latest run attested that tree. A different tree, a second pull request, a failed latest run, a train-sourced attestation, or a checkout that is not this train's merge all run the workflow.
