---
title: Knowledge recorded without Git carries over when a repository is created
status: open
priority: must
required_evidence: tested
tags:
  - cli
  - mcp
  - branching
  - vcs
semantic_text: The first Kibi operation on a Git branch that has no store, in a workspace with a kibi-internal/no-git store, must leave no authored .kb source on disk out of the branch store. It must keep the no-Git store under .kb/recovery/no-git-adoption.
rationale: Without adoption, git init would leave the knowledge base looking empty to an agent until every .kb file was staged, and the knowledge recorded without Git would be lost to the new branch.
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage." Maintainer decision, 2026-11-25: approved these requirements and ADR-kibi-workspaces-without-git as worded ("Approve all").'
  recorded_at: '2026-11-25T09:21:11.248Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 1c4e53a40d3cd72e44dedb1582903ce4162fbc4434c1ea434c45ac87ebcc5eba
semantic_inventory:
  - claim_key: CLAIM-D570E5AFCA2D40D9
    claim_text: The first Kibi operation on a Git branch that has no store, in a workspace with a kibi-internal/no-git store, must leave no authored .kb source on disk out of the branch store
    role: normative
    status: modeled
    span:
      start: 0
      end: 175
  - claim_key: CLAIM-6D5F93D58D44875B
    claim_text: It must keep the no-Git store under .kb/recovery/no-git-adoption
    role: normative
    status: modeled
    span:
      start: 177
      end: 241
logic_claims:
  - CLAIM-D570E5AFCA2D40D9
  - CLAIM-6D5F93D58D44875B
id: REQ-kibi-no-git-store-adopted-on-git-init
type: req
---
The first Kibi operation on a Git branch that has no store, in a workspace with a kibi-internal/no-git store, must leave no authored .kb source on disk out of the branch store. It must keep the no-Git store under .kb/recovery/no-git-adoption.

## Context

The operation writes pending-source receipts binding every untracked authored source on disk to the new branch, moves the no-Git store into .kb/recovery/no-git-adoption/ with a journal, deletes nothing, and reports the adoption once on the next result (no_git_store_adopted), naming kibi init as the next step. A process that loses the race to another finds no store and does nothing. See ADR-kibi-workspaces-without-git, decision 6.

## Source

> Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn't completely block Kibi usage." Maintainer decision, 2026-11-25: approved these requirements and ADR-kibi-workspaces-without-git as worded ("Approve all").
