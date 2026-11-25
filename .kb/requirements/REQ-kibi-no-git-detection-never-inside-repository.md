---
title: A .git entry Git cannot read is refused, never treated as no repository
status: open
priority: must
required_evidence: tested
tags:
  - cli
  - mcp
  - branching
  - vcs
semantic_text: Kibi must refuse an operation in a workspace with a .git entry that Git cannot read with the error code GIT_REPOSITORY_UNREADABLE.
rationale: Treating a repository Git refuses (ownership, permissions, a broken .git file) as a workspace without Git would split the knowledge from the branch it belongs to and write a second store beside it; Git's own diagnostic is the fix the person needs.
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage." Maintainer decision, 2026-11-25: approved these requirements and ADR-kibi-workspaces-without-git as worded ("Approve all").'
  recorded_at: '2026-11-25T09:16:31.892Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 5032f6978c26da08b8324a8074f8060f7a5a26ad64150addc6cc9b1d9236787a
semantic_inventory:
  - claim_key: CLAIM-75928EACD7DE49BD
    claim_text: Kibi must refuse an operation in a workspace with a .git entry that Git cannot read with the error code GIT_REPOSITORY_UNREADABLE
    role: normative
    status: modeled
    span:
      start: 0
      end: 129
logic_claims:
  - CLAIM-75928EACD7DE49BD
id: REQ-kibi-no-git-detection-never-inside-repository
type: req
---
Kibi must refuse an operation in a workspace with a .git entry that Git cannot read with the error code GIT_REPOSITORY_UNREADABLE.

## Context

The refusal is not retryable and attaches no store: no kibi-internal/no-git store is created there. A .git entry without a usable Git is refused the same way with GIT_NOT_AVAILABLE. See ADR-kibi-workspaces-without-git, decision 2.

## Source

> Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn't completely block Kibi usage." Maintainer decision, 2026-11-25: approved these requirements and ADR-kibi-workspaces-without-git as worded ("Approve all").
