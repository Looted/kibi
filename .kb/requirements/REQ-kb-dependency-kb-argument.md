---
title: Search, query, status, find-gaps, coverage and graph accept a kb argument naming a KB dependency over MCP and the CLI
status: open
semantic_text: Kibi's search, query, status, find-gaps, coverage and graph operations must accept a kb argument naming a KB dependency over MCP and the CLI.
semantic_clauses:
  - Kibi's search, query, status, find-gaps, coverage and graph operations must accept a kb argument naming a KB dependency over MCP and the CLI
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 2e2a0bd0799dc76f5001db1a73839865eec5c36335d24888c7f6976edafab183
semantic_inventory:
  - claim_key: CLAIM-12CFD74D2BA5EF66
    claim_text: Kibi's search, query, status, find-gaps, coverage and graph operations must accept a kb argument naming a KB dependency over MCP and the CLI
    role: normative
    status: modeled
    span:
      start: 0
      end: 140
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-12CFD74D2BA5EF66
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-10, approving the behavior splits of the requirements the develop merge made broad in the KB gold-standard review (split batch 6): "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T15:00:11.808Z'
priority: must
firmness: firm
tags:
  - dependencies
  - git
  - mcp
  - cli
id: REQ-kb-dependency-kb-argument
type: req
---
Kibi's search, query, status, find-gaps, coverage and graph operations must accept a kb argument naming a KB dependency over MCP and the CLI.

## Context

Every harness reaches dependencies the same way: one kb argument on the read operations, with the same name and schema over MCP and the CLI.

The maintainer wants Kibi to grow toward a view across several codebases, starting with a project reading the KBs of the repositories it depends on (a library it uses, or a service it calls) to learn how they are meant to be used. Each dependency must be read at the version the project actually uses, so projects can upgrade at their own pace, and a dependency's KB must stay a separate read-only copy that never mixes with the project's KB or slows it down. Git repositories come first because every Kibi KB lives in one; package and path sources can follow. KB schema 6 is the oldest schema Kibi migrates cleanly, so it is the floor for dependencies.

## Why this changed

Refines the git KB dependencies umbrella into its five behaviors, one sentence each, unchanged. The umbrella keeps its wording; only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-10, approving the behavior splits of the requirements the develop merge made broad in the KB gold-standard review (split batch 6): "Ok"
