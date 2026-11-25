---
title: Kibi advises using Git without failing the operation
status: open
priority: must
required_evidence: tested
tags:
  - cli
  - mcp
  - branching
  - vcs
semantic_text: In a workspace outside any Git repository, kibi init, kibi doctor and the status operation must succeed. Their results must carry the no_git_repository advisory.
rationale: 'The maintainer asked for an advisory instead of a refusal: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage." Maintainer decision, 2026-11-25: approved these requirements and ADR-kibi-workspaces-without-git as worded ("Approve all").'
  recorded_at: '2026-11-25T09:19:14.547Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a62ab6d8f8b4e16c01b566de9e2338a5eac902aa015a5c667a9906554d9ab3dc
semantic_inventory:
  - claim_key: CLAIM-89EA3021F22D6844
    claim_text: In a workspace outside any Git repository, kibi init, kibi doctor and the status operation must succeed
    role: normative
    status: modeled
    span:
      start: 0
      end: 103
  - claim_key: CLAIM-CA0C9856FA6E7601
    claim_text: Their results must carry the no_git_repository advisory
    role: normative
    status: modeled
    span:
      start: 105
      end: 160
logic_claims:
  - CLAIM-89EA3021F22D6844
  - CLAIM-CA0C9856FA6E7601
id: REQ-kibi-no-git-advisory
type: req
---
In a workspace outside any Git repository, kibi init, kibi doctor and the status operation must succeed. Their results must carry the no_git_repository advisory.

## Context

The advisory is a warning. It names what is off until there is a repository (the commit gate, Git hooks, impact review and per-branch knowledge), recommends git init and then kibi init (installing Git first when it is missing), and says to finish a change with kibi check; with KIBI_BRANCH set it says that the variable selects the store only in processes that set it. kibi check and the host session start carry it too, and the agent instructions and session brief name kibi check instead of the commit gate. See ADR-kibi-workspaces-without-git, decision 4.

## Source

> Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn't completely block Kibi usage." Maintainer decision, 2026-11-25: approved these requirements and ADR-kibi-workspaces-without-git as worded ("Approve all").
