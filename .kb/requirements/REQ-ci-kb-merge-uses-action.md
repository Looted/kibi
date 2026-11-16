---
title: Kibi's KB merge workflow merges with the published KB merge action
status: open
priority: should
required_evidence: tested
firmness: default
tags:
  - ci
  - merge
  - kb
semantic_text: The Kibi KB merge workflow must merge pull requests with the published Kibi KB merge action.
rationale: GitHub's merge check never runs a custom merge driver, so open pull requests conflict on .kb/symbols.yaml after every merge even though kibi merge-driver resolves them. The maintainer asked for automation that resolves these conflicts on GitHub, documented so Kibi consumers can replicate it in their own repositories. Running the same action Kibi publishes keeps the documented consumer setup exercised on every merge in Kibi's own repository.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the Kibi KB merge action statements: "Approved"'
  approved_by: maintainer
  recorded_at: '2026-11-16T18:13:07.030Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 39ea1424972e213c4d6b6645606e11a189aa5376d9cd09359da276991f05e5f5
semantic_inventory:
  - claim_key: CLAIM-75CACECFD17CE93C
    claim_text: The Kibi KB merge workflow must merge pull requests with the published Kibi KB merge action
    role: normative
    status: modeled
    span:
      start: 0
      end: 91
logic_claims:
  - CLAIM-75CACECFD17CE93C
id: REQ-ci-kb-merge-uses-action
type: req
---
The Kibi KB merge workflow must merge pull requests with the published Kibi KB merge action.

## Context

GitHub's merge check never runs a custom merge driver, so open pull requests conflict on .kb/symbols.yaml after every merge even though kibi merge-driver resolves them. The maintainer asked for automation that resolves these conflicts on GitHub, documented so Kibi consumers can replicate it in their own repositories. Running the same action Kibi publishes keeps the documented consumer setup exercised on every merge in Kibi's own repository.

## Source

> Maintainer decision, 2026-11-16, approving the Kibi KB merge action statements: "Approved"