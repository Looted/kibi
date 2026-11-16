---
title: A push to a feature branch checks only that branch's pull request
status: open
priority: should
required_evidence: tested
firmness: default
tags:
  - ci
  - merge
  - kb
semantic_text: When a branch other than develop is pushed, the Kibi KB merge workflow must check only that branch's pull request for Kibi manifest conflicts.
rationale: GitHub's merge check never runs a custom merge driver, so open pull requests conflict on .kb/symbols.yaml after every merge even though kibi merge-driver resolves them. The maintainer asked for automation that resolves these conflicts on GitHub, documented so Kibi consumers can replicate it in their own repositories. A branch that adds records after develop moved conflicts at once and used to wait for the next push to develop; GitHub does not start pull_request workflows for a pull request with conflicts, so the workflow runs on push.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the Kibi KB merge action statements: "Approved"'
  approved_by: maintainer
  recorded_at: '2026-11-16T18:13:04.481Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: f94b6182b741bf9da9336c905cee62aab9382cb5e71e178eb69450a3056ff25c
semantic_inventory:
  - claim_key: CLAIM-6D55BD2C000C6ED2
    claim_text: When a branch other than develop is pushed, the Kibi KB merge workflow must check only that branch's pull request for Kibi manifest conflicts
    role: condition
    status: modeled
    span:
      start: 0
      end: 141
logic_claims:
  - CLAIM-6D55BD2C000C6ED2
id: REQ-ci-kb-merge-branch-push
type: req
---
When a branch other than develop is pushed, the Kibi KB merge workflow must check only that branch's pull request for Kibi manifest conflicts.

## Context

GitHub's merge check never runs a custom merge driver, so open pull requests conflict on .kb/symbols.yaml after every merge even though kibi merge-driver resolves them. The maintainer asked for automation that resolves these conflicts on GitHub, documented so Kibi consumers can replicate it in their own repositories. A branch that adds records after develop moved conflicts at once and used to wait for the next push to develop; GitHub does not start pull_request workflows for a pull request with conflicts, so the workflow runs on push.

## Source

> Maintainer decision, 2026-11-16, approving the Kibi KB merge action statements: "Approved"