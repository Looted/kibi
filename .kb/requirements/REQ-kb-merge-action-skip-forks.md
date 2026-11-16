---
title: The KB merge action skips pull requests from forks
status: open
priority: should
required_evidence: tested
firmness: default
tags:
  - ci
  - merge
  - kb
semantic_text: The Kibi KB merge action must skip pull requests whose branch is in a fork.
rationale: GitHub's merge check never runs a custom merge driver, so open pull requests conflict on .kb/symbols.yaml after every merge even though kibi merge-driver resolves them. The maintainer asked for automation that resolves these conflicts on GitHub, documented so Kibi consumers can replicate it in their own repositories. A workflow cannot push to a fork's branch, so trying only fails the run.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the Kibi KB merge action statements: "Approved"'
  approved_by: maintainer
  recorded_at: '2026-11-16T18:12:59.576Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c27e05737b7aa86142ec1490db27648999d304f72174314c832b53da8cb31ef5
semantic_inventory:
  - claim_key: CLAIM-C7EEE3C5EB55C0A9
    claim_text: The Kibi KB merge action must skip pull requests whose branch is in a fork
    role: normative
    status: modeled
    span:
      start: 0
      end: 74
logic_claims:
  - CLAIM-C7EEE3C5EB55C0A9
id: REQ-kb-merge-action-skip-forks
type: req
---
The Kibi KB merge action must skip pull requests whose branch is in a fork.

## Context

GitHub's merge check never runs a custom merge driver, so open pull requests conflict on .kb/symbols.yaml after every merge even though kibi merge-driver resolves them. The maintainer asked for automation that resolves these conflicts on GitHub, documented so Kibi consumers can replicate it in their own repositories. A workflow cannot push to a fork's branch, so trying only fails the run.

## Source

> Maintainer decision, 2026-11-16, approving the Kibi KB merge action statements: "Approved"