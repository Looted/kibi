---
title: Merged-tree commands run without the merge token
status: active
expects: success
tags:
  - ci
origin:
  kind: agent
  recorded_at: '2026-11-18T08:27:36.737Z'
id: SCEN-ci-merge-actions-tree-commands-tokens
type: scenario
---
The merge train verifies a train, and kb-merge syncs a merged branch. Each runs kibi sync and the check command in the merged tree with an environment that holds no GH_TOKEN, GITHUB_TOKEN or GitHub Actions runtime token, while the action itself still uses its token to talk to GitHub.