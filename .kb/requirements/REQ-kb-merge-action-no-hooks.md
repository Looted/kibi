---
title: The KB merge action does not run the repository's Git hooks
status: open
priority: should
required_evidence: tested
firmness: default
tags:
  - ci
  - merge
  - kb
semantic_text: The Kibi KB merge action must not run the repository's Git hooks when it commits or pushes a merge.
rationale: GitHub's merge check never runs a custom merge driver, so open pull requests conflict on .kb/symbols.yaml after every merge even though kibi merge-driver resolves them. The maintainer asked for automation that resolves these conflicts on GitHub, documented so Kibi consumers can replicate it in their own repositories. Installing the base branch's dependencies can install Git hooks such as a staged-change gate, which would judge or refuse the merge commit; the action's own check is the gate.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the Kibi KB merge action statements: "Approved"'
  approved_by: maintainer
  recorded_at: '2026-11-16T18:13:01.893Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 11892761eb69b0d63d23abc7c04e14a640fc2d4f494fa2d91587420d0ccf85a3
semantic_inventory:
  - claim_key: CLAIM-00139F706F1C3981
    claim_text: The Kibi KB merge action must not run the repository's Git hooks when it commits or pushes a merge
    role: normative
    status: modeled
    span:
      start: 0
      end: 98
logic_claims:
  - CLAIM-00139F706F1C3981
id: REQ-kb-merge-action-no-hooks
type: req
---
The Kibi KB merge action must not run the repository's Git hooks when it commits or pushes a merge.

## Context

GitHub's merge check never runs a custom merge driver, so open pull requests conflict on .kb/symbols.yaml after every merge even though kibi merge-driver resolves them. The maintainer asked for automation that resolves these conflicts on GitHub, documented so Kibi consumers can replicate it in their own repositories. Installing the base branch's dependencies can install Git hooks such as a staged-change gate, which would judge or refuse the merge commit; the action's own check is the gate.

## Source

> Maintainer decision, 2026-11-16, approving the Kibi KB merge action statements: "Approved"