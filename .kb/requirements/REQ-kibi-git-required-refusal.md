---
title: A feature that needs Git is refused with GIT_REQUIRED outside a repository
status: open
priority: must
required_evidence: tested
tags:
  - cli
  - mcp
  - branching
  - vcs
semantic_text: In a workspace outside any Git repository, an operation that reads Git must fail with the error code GIT_REQUIRED. That failure must not be retryable.
rationale: Without Git there is no commit gate, hook, staged snapshot or branch to read. A coded refusal keeps the missing gate visible; running a different check in its place would hide that there is no gate.
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage." Maintainer decision, 2026-11-25: approved these requirements and ADR-kibi-workspaces-without-git as worded ("Approve all").'
  recorded_at: '2026-11-25T09:17:33.218Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 025b8541ecbc574e85fc10bdc92a7f232fbcd03809276f51d7381bc409d3e3f2
semantic_inventory:
  - claim_key: CLAIM-CB1939107CACA9F5
    claim_text: In a workspace outside any Git repository, an operation that reads Git must fail with the error code GIT_REQUIRED
    role: normative
    status: modeled
    span:
      start: 0
      end: 113
  - claim_key: CLAIM-5126EC5949FD44AE
    claim_text: That failure must not be retryable
    role: normative
    status: modeled
    span:
      start: 115
      end: 149
logic_claims:
  - CLAIM-CB1939107CACA9F5
  - CLAIM-5126EC5949FD44AE
id: REQ-kibi-git-required-refusal
type: req
---
In a workspace outside any Git repository, an operation that reads Git must fail with the error code GIT_REQUIRED. That failure must not be retryable.

## Context

The message names what the feature reads from Git, the Git-free command to run instead (for example kibi check for kibi check --staged) and how to turn the feature on (git init, then kibi init). The features are the commit gate, kibi check-generated --staged, kibi check-diff, kibi hooks install, kibi branch ensure and migrate, kibi gc, impact review and kibi signoff. See ADR-kibi-workspaces-without-git, decision 5.

## Source

> Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn't completely block Kibi usage." Maintainer decision, 2026-11-25: approved these requirements and ADR-kibi-workspaces-without-git as worded ("Approve all").
