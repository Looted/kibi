---
title: The merge actions run no merged-tree command with a GitHub token
status: active
fact_kind: property_value
subject_key: kibi.ci.merge_train
property_key: merged_tree_commands_run_with_github_token
operator: eq
value_type: int
value_int: 0
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
claim_key: CLAIM-6B23D37D973DF854
claim_text: The merge-train and kb-merge actions must run kibi sync and the check command in the merged tree without GH_TOKEN, GITHUB_TOKEN or the GitHub Actions runtime tokens in their environment
origin:
  kind: agent
  recorded_at: '2026-11-18T07:14:45.881Z'
id: FACT-ci-merge-actions-tree-commands-tokens
type: fact
---
Counts kibi sync and check commands that the merge-train or kb-merge action runs in a merged tree with GH_TOKEN, GITHUB_TOKEN or a GitHub Actions runtime token in their environment; zero means none gets a token.
