---
title: One Node engine is the single writer per workspace and branch, reached through the framed protocol
status: open
semantic_text: Kibi MUST run one Node.js 18+ single-writer engine for each canonical workspace and branch. CLI and MCP clients MUST use the framed local engine protocol and MUST NOT start one-shot SWI-Prolog processes for normal operations.
semantic_clauses:
  - Kibi MUST run one Node.js 18+ single-writer engine for each canonical workspace and branch
  - CLI and MCP clients MUST use the framed local engine protocol and MUST NOT start one-shot SWI-Prolog processes for normal operations
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 48d405325ca5f561ae5a94b499059dbf6ec52185b7aac5f46476523a3875aab0
semantic_inventory:
  - claim_key: CLAIM-D1C9836C4BA9898F
    claim_text: Kibi MUST run one Node.js 18+ single-writer engine for each canonical workspace and branch
    role: normative
    status: modeled
    span:
      start: 0
      end: 90
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-074FF437D34CE843
    claim_text: CLI and MCP clients MUST use the framed local engine protocol and MUST NOT start one-shot SWI-Prolog processes for normal operations
    role: normative
    status: modeled
    span:
      start: 92
      end: 224
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-D1C9836C4BA9898F
  - CLAIM-074FF437D34CE843
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T07:25:49.880Z'
priority: must
tags:
  - core
  - engine
  - prolog
  - persistence
firmness: firm
id: REQ-kibi-engine-single-writer-protocol
type: req
---
Kibi MUST run one Node.js 18+ single-writer engine for each canonical workspace and branch. CLI and MCP clients MUST use the framed local engine protocol and MUST NOT start one-shot SWI-Prolog processes for normal operations.

## Context

Simultaneous clients fold onto one daemon, so writes for one branch are serialized in one place instead of racing in separate Prolog processes.

The engine is the only writer of a branch store, so a second writer, a partial commit, an unchecked migration or a silent full recompile would each lose or corrupt KB state that every later check relies on.

## Why this changed

Split from REQ-core-journaled-engine-persistence, which held four behaviors: one single-writer engine reached through the framed protocol, durable RDF transactions, guarded legacy migration, and delta compilation on normal sync. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
