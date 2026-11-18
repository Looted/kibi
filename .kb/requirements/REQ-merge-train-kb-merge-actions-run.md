---
title: The merge actions run commands in the merged tree without GitHub tokens
status: open
firmness: default
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer-approved statement (2026-11-18, "Approve all"): "The merge-train and kb-merge actions must run kibi sync and the check command in the merged tree without GH_TOKEN, GITHUB_TOKEN or the GitHub Actions runtime tokens in their environment."'
  recorded_at: '2026-11-18T07:11:55.585Z'
rationale: The merged tree holds pull request content, and the token that pushes merges and starts workflows must not reach the commands that run on it. A pull request could otherwise read the merge token from the environment of its own check script.
semantic_text: The merge-train and kb-merge actions must run kibi sync and the check command in the merged tree without GH_TOKEN, GITHUB_TOKEN or the GitHub Actions runtime tokens in their environment.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 9f006fdb976d34d314eaa51328b34b49fac8cac5c0f0442edd9451d9a138ab7e
semantic_inventory:
  - claim_key: CLAIM-6B23D37D973DF854
    claim_text: The merge-train and kb-merge actions must run kibi sync and the check command in the merged tree without GH_TOKEN, GITHUB_TOKEN or the GitHub Actions runtime tokens in their environment
    role: normative
    status: modeled
    subjects:
      - kibi.ci.merge_train
    span:
      start: 0
      end: 185
logic_claims:
  - CLAIM-6B23D37D973DF854
id: REQ-merge-train-kb-merge-actions-run
type: req
required_evidence: tested
---
The merge-train and kb-merge actions must run kibi sync and the check command in the merged tree without GH_TOKEN, GITHUB_TOKEN or the GitHub Actions runtime tokens in their environment.

## Context

The merged tree holds pull request content, and the token that pushes merges and starts workflows must not reach the commands that run on it. A pull request could otherwise read the merge token from the environment of its own check script.
