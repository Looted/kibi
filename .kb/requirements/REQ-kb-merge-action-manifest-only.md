---
title: The KB merge action merges a pull request only when its conflicts are Kibi manifests
status: open
priority: should
required_evidence: tested
firmness: default
tags:
  - ci
  - merge
  - kb
semantic_text: The Kibi KB merge action must merge the base branch into a pull request only when every conflicting file is a Kibi manifest (.kb/symbols.yaml or a .kb/relationships shard); a pull request with any other conflict, or with a conflict the merge driver cannot resolve, must be left unchanged.
rationale: GitHub's merge check never runs a custom merge driver, so open pull requests conflict on .kb/symbols.yaml after every merge even though kibi merge-driver resolves them. The maintainer asked for automation that resolves these conflicts on GitHub, documented so Kibi consumers can replicate it in their own repositories. Any other conflict is a decision a person has to make, so the action must not guess.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the Kibi KB merge action statements: "Approved"'
  approved_by: maintainer
  recorded_at: '2026-11-16T18:12:53.242Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d55e5ce719d917c9fe492b47a7d77482e2d875d09d13376eedac9afabe2d74db
semantic_inventory:
  - claim_key: CLAIM-21983BB3394932A4
    claim_text: The Kibi KB merge action must merge the base branch into a pull request only when every conflicting file is a Kibi manifest (.kb/symbols.yaml or a .kb/relationships shard)
    role: normative
    status: modeled
    span:
      start: 0
      end: 171
  - claim_key: CLAIM-966D61299F5C1DD9
    claim_text: a pull request with any other conflict, or with a conflict the merge driver cannot resolve, must be left unchanged
    role: normative
    status: modeled
    span:
      start: 173
      end: 287
logic_claims:
  - CLAIM-21983BB3394932A4
  - CLAIM-966D61299F5C1DD9
id: REQ-kb-merge-action-manifest-only
type: req
---
The Kibi KB merge action must merge the base branch into a pull request only when every conflicting file is a Kibi manifest (.kb/symbols.yaml or a .kb/relationships shard); a pull request with any other conflict, or with a conflict the merge driver cannot resolve, must be left unchanged.

## Context

GitHub's merge check never runs a custom merge driver, so open pull requests conflict on .kb/symbols.yaml after every merge even though kibi merge-driver resolves them. The maintainer asked for automation that resolves these conflicts on GitHub, documented so Kibi consumers can replicate it in their own repositories. Any other conflict is a decision a person has to make, so the action must not guess.

## Source

> Maintainer decision, 2026-11-16, approving the Kibi KB merge action statements: "Approved"