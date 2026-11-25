---
title: Working without Git is reported as a success with vcs none
status: open
priority: must
required_evidence: tested
tags:
  - cli
  - mcp
  - branching
  - vcs
semantic_text: Usage telemetry must record an operation that succeeds in a workspace outside any Git repository with the status success. Its vcs property must be none.
rationale: Init outside Git was the adoption problem telemetry surfaced (From 2026-11-15 to 2026-11-25, 5 of the 9 installations that ran kibi init had it fail outside a Git repository.); after the change those runs must count as successes, and the share of workspaces without Git must be visible without sending any path.
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage." Maintainer decision, 2026-11-25: approved these requirements and ADR-kibi-workspaces-without-git as worded ("Approve all").'
  recorded_at: '2026-11-25T09:21:46.615Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 7b94d654a1e4eb847279b30a32a796eb926d4bbdfbecda07ddb95311c1a8a69c
semantic_inventory:
  - claim_key: CLAIM-B63413AC5C25504F
    claim_text: Usage telemetry must record an operation that succeeds in a workspace outside any Git repository with the status success
    role: normative
    status: modeled
    span:
      start: 0
      end: 120
  - claim_key: CLAIM-C8F546135B334042
    claim_text: Its vcs property must be none
    role: normative
    status: modeled
    span:
      start: 122
      end: 151
logic_claims:
  - CLAIM-B63413AC5C25504F
  - CLAIM-C8F546135B334042
id: REQ-kibi-no-git-telemetry-outcome
type: req
---
Usage telemetry must record an operation that succeeds in a workspace outside any Git repository with the status success. Its vcs property must be none.

## Context

vcs is git or none, and vcs_reason is not_a_repository or git_unavailable; neither carries a path. GIT_REQUIRED and GIT_REPOSITORY_UNREADABLE are counted as rejections. See ADR-kibi-workspaces-without-git, consequences.

## Source

> Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn't completely block Kibi usage." Maintainer decision, 2026-11-25: approved these requirements and ADR-kibi-workspaces-without-git as worded ("Approve all").
