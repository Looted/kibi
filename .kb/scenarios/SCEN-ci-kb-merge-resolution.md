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
An open pull request whose only conflicts with develop are Kibi manifests, branched before `kibi merge-driver` existed, with a bun.lock that no longer matches develop, and with one new requirement in proof/baseline.json while develop also added one.

## When
develop moves and the Kibi KB merge workflow resolves the pull request.

## Then
- The merge driver is built from develop, so the merge runs although the pull request has no driver.
- The stale lockfile is refreshed in the merge commit instead of failing the install.
- proof/baseline.json counts are recomputed from its entries, so both added requirements are counted.
- The pre-push proof check runs on the merge commit, and the merge is pushed only if it passes.
