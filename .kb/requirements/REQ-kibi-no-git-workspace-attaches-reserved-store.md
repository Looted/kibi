---
title: A workspace outside any Git repository attaches the reserved no-Git store
status: open
priority: must
required_evidence: tested
tags:
  - cli
  - mcp
  - branching
  - vcs
semantic_text: Kibi must attach the knowledge store kibi-internal/no-git to every operation in a workspace outside any Git repository when KIBI_BRANCH is not set.
rationale: 'The maintainer does not want Kibi refused outside Git: "I don''t think we should refuse working outside of Git. I think if someone doesn''t have Git, that basically simplifies the flow, also makes the commit gate not work, but as long as the hooks are there, I mean technically the MCP can be still used." Agents set Kibi up before git init: from 2026-11-15 to 2026-11-25, 5 of the 9 installations that ran kibi init had it fail outside Git.'
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "we shouldn''t completely block Kibi usage." Maintainer decision, 2026-11-25: approved these requirements and ADR-kibi-workspaces-without-git as worded ("Approve all").'
  recorded_at: '2026-11-25T09:08:55.021Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 48437ecaffaac203f55d90542947866c72b6267b003f6a784f631423f9c0e778
semantic_inventory:
  - claim_key: CLAIM-E628892840EB7FAF
    claim_text: Kibi must attach the knowledge store kibi-internal/no-git to every operation in a workspace outside any Git repository when KIBI_BRANCH is not set
    role: normative
    status: modeled
    span:
      start: 0
      end: 146
logic_claims:
  - CLAIM-E628892840EB7FAF
id: REQ-kibi-no-git-workspace-attaches-reserved-store
type: req
---
Kibi must attach the knowledge store kibi-internal/no-git to every operation in a workspace outside any Git repository when KIBI_BRANCH is not set.

## Context

The store name is constant and reserved: it is not a branch and not a default branch, nothing in .kb/ selects it, and KIBI_BRANCH cannot name the kibi-internal/ namespace. KIBI_BRANCH still names a store when it is set (ADR-012, section 1.1), and the advisory says it applies only to the processes that set it. See ADR-kibi-workspaces-without-git.

## Source

> Maintainer, 2026-11-25: "we shouldn't completely block Kibi usage." Maintainer decision, 2026-11-25: approved these requirements and ADR-kibi-workspaces-without-git as worded ("Approve all").
