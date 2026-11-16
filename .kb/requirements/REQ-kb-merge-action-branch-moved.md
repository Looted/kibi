---
title: The KB merge action merges again when the branch moves meanwhile
status: open
priority: should
required_evidence: tested
firmness: default
tags:
  - ci
  - merge
  - kb
semantic_text: When a pull request branch moves while the Kibi KB merge action is merging it, the action must not overwrite the new commits and must merge again on the new tip, up to the configured number of attempts.
rationale: GitHub's merge check never runs a custom merge driver, so open pull requests conflict on .kb/symbols.yaml after every merge even though kibi merge-driver resolves them. The maintainer asked for automation that resolves these conflicts on GitHub, documented so Kibi consumers can replicate it in their own repositories. On 2026-11-16 every failed run of Kibi's own KB merge workflow was a branch that received a commit while the workflow was merging it, so the push was refused and the conflict stayed.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the Kibi KB merge action statements: "Approved"'
  approved_by: maintainer
  recorded_at: '2026-11-16T18:12:57.583Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 4b5cadd89b2e46dc6d2779bdab47f064406f05ab416ffe05c8328da423bca506
semantic_inventory:
  - claim_key: CLAIM-78EE54E333D35430
    claim_text: When a pull request branch moves while the Kibi KB merge action is merging it, the action must not overwrite the new commits and must merge again on the new tip, up to the configured number of attempts
    role: condition
    status: modeled
    span:
      start: 0
      end: 201
logic_claims:
  - CLAIM-78EE54E333D35430
id: REQ-kb-merge-action-branch-moved
type: req
---
When a pull request branch moves while the Kibi KB merge action is merging it, the action must not overwrite the new commits and must merge again on the new tip, up to the configured number of attempts.

## Context

GitHub's merge check never runs a custom merge driver, so open pull requests conflict on .kb/symbols.yaml after every merge even though kibi merge-driver resolves them. The maintainer asked for automation that resolves these conflicts on GitHub, documented so Kibi consumers can replicate it in their own repositories. On 2026-11-16 every failed run of Kibi's own KB merge workflow was a branch that received a commit while the workflow was merging it, so the push was refused and the conflict stayed.

## Source

> Maintainer decision, 2026-11-16, approving the Kibi KB merge action statements: "Approved"