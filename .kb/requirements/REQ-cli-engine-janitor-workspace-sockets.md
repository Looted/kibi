---
title: kibi engine janitor sweeps current workspace dead daemon sockets by default
status: open
priority: should
firmness: default
required_evidence: tested
tags:
  - cli
  - engine
  - janitor
semantic_text: kibi engine janitor must sweep dead daemon sockets belonging to the current workspace by default.
logic_claims:
  - CLAIM-4848F580D84B48AF
semantic_clauses:
  - kibi engine janitor must sweep dead daemon sockets belonging to the current workspace by default.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 794f874796e5bc17a7034d406bca1083734bbc42a675faa3cbb47286131d49d3
semantic_inventory:
  - claim_key: CLAIM-4848F580D84B48AF
    claim_text: kibi engine janitor must sweep dead daemon sockets belonging to the current workspace by default
    role: normative
    status: modeled
    span:
      start: 0
      end: 96
origin:
  kind: agent
  ref: 'Maintainer reply (2026-11-22) approving REQ-cli-engine-janitor-workspace-sockets for GitHub issue #829 (item 3, janitor half), shown with its exact statement: "1 Approved"'
  approved_by: maintainer
  recorded_at: '2026-11-22T16:11:04Z'
id: REQ-cli-engine-janitor-workspace-sockets
type: req
---
kibi engine janitor must sweep dead daemon sockets belonging to the current workspace by default.

## Context

`kibi engine janitor --all` help text states that `--all` also sweeps runtime-directory daemon sockets from other workspaces, but `sweepRuntimeSockets` previously returned early whenever `--all` was omitted, skipping the current workspace own dead sockets. Requested in GitHub issue #829 (item 3, janitor half).

## Source

> `kibi engine janitor` should clean the current workspace's dead socket by default (without requiring `--all`).

GitHub issue #829 (item 3, janitor half).
