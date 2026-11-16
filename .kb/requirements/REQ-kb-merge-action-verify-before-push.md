---
title: The KB merge action pushes a merge only after sync and the check pass
status: open
priority: should
required_evidence: tested
firmness: default
tags:
  - ci
  - merge
  - kb
semantic_text: The Kibi KB merge action must push a merge only after kibi sync leaves every tracked file unchanged and the configured check passes on the merged tree.
rationale: GitHub's merge check never runs a custom merge driver, so open pull requests conflict on .kb/symbols.yaml after every merge even though kibi merge-driver resolves them. The maintainer asked for automation that resolves these conflicts on GitHub, documented so Kibi consumers can replicate it in their own repositories. A merge commit pushed to a pull request is shared work, so it must not land in a state the repository's own gate would reject.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the Kibi KB merge action statements: "Approved"'
  approved_by: maintainer
  recorded_at: '2026-11-16T18:12:55.444Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 5564aec2e903d787712a534e21583ce38d45d12f9fa15cbe0f5d6a6ebb8f5858
semantic_inventory:
  - claim_key: CLAIM-08C7614EDD0BD1B7
    claim_text: The Kibi KB merge action must push a merge only after kibi sync leaves every tracked file unchanged and the configured check passes on the merged tree
    role: normative
    status: modeled
    span:
      start: 0
      end: 150
logic_claims:
  - CLAIM-08C7614EDD0BD1B7
id: REQ-kb-merge-action-verify-before-push
type: req
---
The Kibi KB merge action must push a merge only after kibi sync leaves every tracked file unchanged and the configured check passes on the merged tree.

## Context

GitHub's merge check never runs a custom merge driver, so open pull requests conflict on .kb/symbols.yaml after every merge even though kibi merge-driver resolves them. The maintainer asked for automation that resolves these conflicts on GitHub, documented so Kibi consumers can replicate it in their own repositories. A merge commit pushed to a pull request is shared work, so it must not land in a state the repository's own gate would reject.

## Source

> Maintainer decision, 2026-11-16, approving the Kibi KB merge action statements: "Approved"