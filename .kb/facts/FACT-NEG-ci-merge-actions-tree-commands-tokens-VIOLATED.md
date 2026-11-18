---
title: A merge action runs a merged-tree command with a GitHub token
status: active
fact_kind: property_value
subject_key: kibi.ci.merge_train
property_key: merged_tree_commands_run_with_github_token
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-18T08:27:34.530Z'
id: FACT-NEG-ci-merge-actions-tree-commands-tokens-VIOLATED
type: fact
---
The merge-train or kb-merge action runs kibi sync or the check command in a merged tree with GH_TOKEN, GITHUB_TOKEN or a GitHub Actions runtime token in its environment, so pull request content can use the token.