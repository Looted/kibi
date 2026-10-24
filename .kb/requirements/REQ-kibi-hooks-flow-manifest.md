---
title: Hooks read flow-layout symbol manifests and kibi sync normalises them
status: open
required_evidence: tested
tags:
  - hooks
  - agent-core
  - claude
  - sync
  - search-lane
  - progressive-disclosure
priority: must
semantic_text: The agent-core knowledge index must read a symbol manifest whose symbols sequence is written in YAML flow layout the same as the block layout. The agent-core knowledge index must report whether the symbol manifest was missing, empty, indexed or unreadable and must list the source files the coordinate artifact binds symbols to and the source files whose manifest records carry no requirement link. The Claude Code edit hook must not describe a source file as unlinked when the manifest is unreadable or when the coordinate artifact binds a symbol to that file but no manifest record of it was indexed. A plain kibi sync must rewrite a flow-layout symbol manifest in block layout while keeping its comments and symbol order.
logic_claims:
  - CLAIM-B02D3310D8DF30DE
  - CLAIM-447BDBDBFFEBD7C3
  - CLAIM-D6A057D3195A654A
  - CLAIM-66223B60371731AA
semantic_clauses:
  - The agent-core knowledge index must read a symbol manifest whose symbols sequence is written in YAML flow layout the same as the block layout.
  - The agent-core knowledge index must report whether the symbol manifest was missing, empty, indexed or unreadable and must list the source files the coordinate artifact binds symbols to and the source files whose manifest records carry no requirement link.
  - The Claude Code edit hook must not describe a source file as unlinked when the manifest is unreadable or when the coordinate artifact binds a symbol to that file but no manifest record of it was indexed.
  - A plain kibi sync must rewrite a flow-layout symbol manifest in block layout while keeping its comments and symbol order.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
rationale: Projects set up with kibi-cli before 2.18.0 keep every symbol on the one flow-sequence line that kibi init's empty list grew into. The shared hook scanner read none of it, so the Claude Code hooks called every linked file unowned and steered agents away from the requirements that governed their edits; the search-lane round 1 evidence showed this on the test project.
semantic_source_hash: 4f14cdef03b48b8d0da0f2d1fab72674d7519f28faf6b6cacfa96aee6a381934
semantic_inventory:
  - claim_key: CLAIM-B02D3310D8DF30DE
    claim_text: The agent-core knowledge index must read a symbol manifest whose symbols sequence is written in YAML flow layout the same as the block layout
    role: normative
    span:
      start: 0
      end: 141
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-447BDBDBFFEBD7C3
    claim_text: The agent-core knowledge index must report whether the symbol manifest was missing, empty, indexed or unreadable and must list the source files the coordinate artifact binds symbols to and the source files whose manifest records carry no requirement link
    role: normative
    span:
      start: 143
      end: 397
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-D6A057D3195A654A
    claim_text: The Claude Code edit hook must not describe a source file as unlinked when the manifest is unreadable or when the coordinate artifact binds a symbol to that file but no manifest record of it was indexed
    role: normative
    span:
      start: 399
      end: 601
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-66223B60371731AA
    claim_text: A plain kibi sync must rewrite a flow-layout symbol manifest in block layout while keeping its comments and symbol order
    role: normative
    span:
      start: 603
      end: 723
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
origin:
  kind: agent
  recorded_at: '2026-10-11T16:20:18.520Z'
id: REQ-kibi-hooks-flow-manifest
type: req
---
# Hooks read flow-layout symbol manifests and kibi sync normalises them

The agent-core knowledge index must read a symbol manifest whose symbols sequence is written in YAML flow layout the same as the block layout. The agent-core knowledge index must report whether the symbol manifest was missing, empty, indexed or unreadable and must list the source files the coordinate artifact binds symbols to and the source files whose manifest records carry no requirement link. The Claude Code edit hook must not describe a source file as unlinked when the manifest is unreadable or when the coordinate artifact binds a symbol to that file but no manifest record of it was indexed. A plain kibi sync must rewrite a flow-layout symbol manifest in block layout while keeping its comments and symbol order.

## Context

kibi-cli before 2.18.0 appended symbols to the `symbols: []` flow sequence that `kibi init` writes, so every symbol of such a project sits on one line of `.kb/symbols.yaml`. The shared `kibi-agent-core` line scanner only understood block sequences and indexed none of them: the Claude Code hooks then told agents that no symbol in a linked file was tied to a requirement, the opposite of the truth, and the misleading note fired on every edit. Found in search-lane round 1 on the test project (analysis in the project files); asked by the project owner as part of the search lane fix PRs. The converting writer that landed in 2.18.0 only fixes a manifest on its next append, so projects that never upsert another symbol stayed broken.

The hook guard is deliberately narrow: a file the coordinate artifact binds a symbol to is only exempt from the unowned note while the manifest record of that symbol is missing from the index, so a file whose record was read but carries no requirement link still gets the honest unowned note.

## Source

> "runner cannot parse flow-style symbols.yaml" - round 1 report, attributed to the shared agent-core scanner; fix PR-1 in the round 1 analysis: parse the flow sequence in `knowledge-index.ts`, normalise an existing flow-style manifest in `kibi sync`, and never fire the unowned note for a file the coordinate artifact covers.
