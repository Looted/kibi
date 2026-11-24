---
title: A single-member train reuses checks only when the git tree matches
status: active
tags:
  - ci
  - merge-train
origin:
  kind: agent
  ref: CI speed review, 2026-11-24, section 5 item K4
  recorded_at: '2026-11-24T15:25:27.179Z'
id: SCEN-ci-merge-train-member-reuse
type: scenario
---
A merge train holds one pull request. Its merge commit, that pull request's commit, and the checkout the workflow would test are the same git tree, and the member's latest run of the workflow attested that tree and passed. The workflow reports success without running the jobs again.

When the tree differs, the train holds more than one pull request, the attestation is missing or names another tree, or the member's latest run failed, the workflow runs in full.
