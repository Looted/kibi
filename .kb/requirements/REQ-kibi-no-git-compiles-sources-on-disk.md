---
title: Without Git, the authored sources on disk are the compiler's input
status: open
priority: must
required_evidence: tested
tags:
  - cli
  - mcp
  - branching
  - vcs
semantic_text: In a workspace outside any Git repository, kibi sync must compile the authored .kb sources on disk without requiring a pending-source receipt for any of them.
rationale: Outside a repository nothing but presence vouches for bytes. With KIBI_BRANCH as the old way through, kibi sync read sources through git ls-files, failed, and left the store stale; a project copied without its .git had the same problem.
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:16:59.550Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 341f33402a268a9a51b08491aa4cc7df9a31cfade23a407a5d69c260d39956de
semantic_inventory:
  - claim_key: CLAIM-9144F9E2119B1B5E
    claim_text: In a workspace outside any Git repository, kibi sync must compile the authored .kb sources on disk without requiring a pending-source receipt for any of them
    role: normative
    status: modeled
    span:
      start: 0
      end: 157
logic_claims:
  - CLAIM-9144F9E2119B1B5E
id: REQ-kibi-no-git-compiles-sources-on-disk
type: req
---
In a workspace outside any Git repository, kibi sync must compile the authored .kb sources on disk without requiring a pending-source receipt for any of them.

## Context

Inside a repository the input stays what Git tracks plus pending-source receipts. The source inventory asks Git first and classifies the workspace only when Git fails, so a repository pays nothing extra. Outside Git no receipt is written. See ADR-kibi-workspaces-without-git, decision 3.
