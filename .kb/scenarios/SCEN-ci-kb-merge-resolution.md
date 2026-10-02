---
title: A KB-only conflict on an older PR branch is merged, proof-checked, and pushed
status: active
priority: should
tags:
  - ci
  - merge
  - proof
id: SCEN-ci-kb-merge-resolution
type: scenario
---
## Given
An open pull request whose only conflicts with develop are Kibi manifests, branched before `kibi merge-driver` existed and carrying a stale bun.lock, with one new requirement in proof/baseline.json while develop also added one.

## When
develop moves and the Kibi KB merge workflow resolves the pull request.

## Then
- Kibi is built from develop and the pull request is checked out beside it, so the merge runs although the pull request has no driver, and its stale lockfile is never installed.
- proof/baseline.json counts are recomputed from its entries, so both added requirements are counted.
- The proof baseline check runs on the merge commit, and the merge is pushed only if it passes.
