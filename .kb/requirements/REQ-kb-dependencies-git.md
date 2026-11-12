---
title: A project reads the KBs of its git dependencies, pinned and read-only
status: closed
priority: must
firmness: firm
tags:
  - dependencies
  - git
  - mcp
  - cli
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer request and decisions, 2026-11-04: "A first step could be allowing a projects kibi to read knowledge bases of it''s dependencies [...] A problem we would have to solve would be pinning the proper .kb version for the release we''re using.", "We can start from schema 6 [...] it should be a read only version, that doesn''t slow down our own kb." and "You can start with git repos." Maintainer decision, 2026-11-10, approving the behavior splits of the requirements the develop merge made broad in the KB gold-standard review (split batch 6): "Ok"'
  recorded_at: '2026-11-04T11:14:55.410Z'
semantic_text: Kibi must read a KB dependency declared in .kb/dependencies.json only at the commit pinned for it in .kb/dependencies.lock.json. Kibi must answer a read scoped to a KB dependency from that dependency's own read-only branch store, never from or into the project's KB. Kibi must refuse a KB dependency whose KB schema is older than 6 or newer than the running Kibi supports. The kibi deps lock command must resolve a declared git ref to a commit and record that commit with the dependency's KB schema. Kibi's search, query, status, find-gaps, coverage and graph operations must accept a kb argument naming a KB dependency over MCP and the CLI.
logic_claims:
  - CLAIM-369DC965CC50460A
  - CLAIM-7B6800923B7B00A8
  - CLAIM-21AC1757CBF6480F
  - CLAIM-2DE614DF1343B592
  - CLAIM-12CFD74D2BA5EF66
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 08428503d3d693d3a9006875217b31b1e6660b8cd02804a1639f8b7bf03e4ff6
semantic_inventory:
  - claim_key: CLAIM-369DC965CC50460A
    claim_text: Kibi must read a KB dependency declared in .kb/dependencies.json only at the commit pinned for it in .kb/dependencies.lock.json
    role: normative
    status: modeled
    span:
      start: 0
      end: 127
  - claim_key: CLAIM-7B6800923B7B00A8
    claim_text: Kibi must answer a read scoped to a KB dependency from that dependency's own read-only branch store, never from or into the project's KB
    role: normative
    status: modeled
    span:
      start: 129
      end: 265
  - claim_key: CLAIM-21AC1757CBF6480F
    claim_text: Kibi must refuse a KB dependency whose KB schema is older than 6 or newer than the running Kibi supports
    role: normative
    status: modeled
    span:
      start: 267
      end: 371
  - claim_key: CLAIM-2DE614DF1343B592
    claim_text: The kibi deps lock command must resolve a declared git ref to a commit and record that commit with the dependency's KB schema
    role: normative
    status: modeled
    span:
      start: 373
      end: 498
  - claim_key: CLAIM-12CFD74D2BA5EF66
    claim_text: Kibi's search, query, status, find-gaps, coverage and graph operations must accept a kb argument naming a KB dependency over MCP and the CLI
    role: normative
    status: modeled
    span:
      start: 500
      end: 640
id: REQ-kb-dependencies-git
type: req
---
Kibi must read a KB dependency declared in .kb/dependencies.json only at the commit pinned for it in .kb/dependencies.lock.json. Kibi must answer a read scoped to a KB dependency from that dependency's own read-only branch store, never from or into the project's KB. Kibi must refuse a KB dependency whose KB schema is older than 6 or newer than the running Kibi supports. The kibi deps lock command must resolve a declared git ref to a commit and record that commit with the dependency's KB schema. Kibi's search, query, status, find-gaps, coverage and graph operations must accept a kb argument naming a KB dependency over MCP and the CLI.

## Context

The maintainer wants Kibi to grow toward a view across several codebases, starting with a project reading the KBs of the repositories it depends on (a library it uses, or a service it calls) to learn how they are meant to be used. Each dependency must be read at the version the project actually uses, so projects can upgrade at their own pace, and a dependency's KB must stay a separate read-only copy that never mixes with the project's KB or slows it down. Git repositories come first because every Kibi KB lives in one; package and path sources can follow. KB schema 6 is the oldest schema Kibi migrates cleanly, so it is the floor for dependencies.

## Source

Maintainer request, 2026-11-04:

> So the idea with reading older kb's is not for the main project. [...] A first step could be allowing a projects kibi to read knowledge bases of it's dependencies (e.g. kibi can read mutalogs .kb to understand how it's meant to be used). [...] A problem we would have to solve would be pinning the proper .kb version for the release we're using.

Maintainer decisions, 2026-11-04:

> We can start from schema 6, no sure about migrate on open. I generally don't want the depdency kb to get mixed up with the projects main one - it should be a read only version, that doesn't slow down our own kb.

> You can start with git repos.
