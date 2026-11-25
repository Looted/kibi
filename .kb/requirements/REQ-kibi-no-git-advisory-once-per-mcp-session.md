---
title: The no-Git advisory is not repeated on every MCP result
status: open
priority: must
required_evidence: tested
tags:
  - cli
  - mcp
  - branching
  - vcs
semantic_text: An MCP server session in a workspace outside any Git repository must attach the no_git_repository advisory to at most one result of an operation other than status and check for each store.
rationale: The advisory cannot change within a session, and every repetition spends agent context; status and check carry it every time because their answer is what the missing repository changes.
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage." Maintainer decision, 2026-11-25: approved these requirements and ADR-kibi-workspaces-without-git as worded ("Approve all").'
  recorded_at: '2026-11-25T09:20:35.485Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 2a4c1cb3329e87066e7d1595a04d278db0b51e9cb9cef195709949b9d1710667
semantic_inventory:
  - claim_key: CLAIM-54B168E21FC16457
    claim_text: An MCP server session in a workspace outside any Git repository must attach the no_git_repository advisory to at most one result of an operation other than status and check for each store
    role: normative
    status: modeled
    span:
      start: 0
      end: 187
logic_claims:
  - CLAIM-54B168E21FC16457
id: REQ-kibi-no-git-advisory-once-per-mcp-session
type: req
---
An MCP server session in a workspace outside any Git repository must attach the no_git_repository advisory to at most one result of an operation other than status and check for each store.

## Context

The first result for a store carries it, so an agent learns the situation from its first call. A change of store (KIBI_BRANCH changed) arms it again. See ADR-kibi-workspaces-without-git, decision 4.

## Source

> Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn't completely block Kibi usage." Maintainer decision, 2026-11-25: approved these requirements and ADR-kibi-workspaces-without-git as worded ("Approve all").
