---
title: kb_check enforces activated check policies as data
status: open
priority: must
tags:
  - plugins
  - check-policy
  - kb-check
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-09: UI design plugin'
  recorded_at: '2026-10-09T12:12:48.441Z'
rationale: An opt-in plugin must be able to make kb_check stricter for the projects that want it, while kb_check, a maintenance path, never runs third-party plugin code.
semantic_text: The kb_check operation must read an activated check policy as JSON data without importing plugin code. The kb_check operation must report a production symbol in an ownership rule file set that implements no current requirement grounded in one of the rule predicates. The kb_check operation must report an implementing file that lacks a pattern marker declared for its requirement pattern. The kb_check operation must block when an activated check policy cannot be read.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 96a84d9e93f7dc17c38e3bbe4b3d7e31ee0e5d709354b15a34cea40a1666eaa5
semantic_inventory:
  - claim_key: CLAIM-A2943DA31DDD9A0C
    claim_text: The kb_check operation must read an activated check policy as JSON data without importing plugin code
    role: normative
    status: modeled
    span:
      start: 0
      end: 101
  - claim_key: CLAIM-EBBD0F5B860E339D
    claim_text: The kb_check operation must report a production symbol in an ownership rule file set that implements no current requirement grounded in one of the rule predicates
    role: normative
    status: modeled
    span:
      start: 103
      end: 265
  - claim_key: CLAIM-84D8DC80CE991920
    claim_text: The kb_check operation must report an implementing file that lacks a pattern marker declared for its requirement pattern
    role: normative
    status: modeled
    span:
      start: 267
      end: 387
  - claim_key: CLAIM-0B667438D7DBFB61
    claim_text: The kb_check operation must block when an activated check policy cannot be read
    role: normative
    status: modeled
    span:
      start: 389
      end: 468
semantic_clauses:
  - The kb_check operation must read an activated check policy as JSON data without importing plugin code.
  - The kb_check operation must report a production symbol in an ownership rule file set that implements no current requirement grounded in one of the rule predicates.
  - The kb_check operation must report an implementing file that lacks a pattern marker declared for its requirement pattern.
  - The kb_check operation must block when an activated check policy cannot be read.
logic_claims:
  - CLAIM-A2943DA31DDD9A0C
  - CLAIM-EBBD0F5B860E339D
  - CLAIM-84D8DC80CE991920
  - CLAIM-0B667438D7DBFB61
id: REQ-capability-check-policy
type: req
---
The kb_check operation must read an activated check policy as JSON data without importing plugin code. The kb_check operation must report a production symbol in an ownership rule file set that implements no current requirement grounded in one of the rule predicates. The kb_check operation must report an implementing file that lacks a pattern marker declared for its requirement pattern. The kb_check operation must block when an activated check policy cannot be read.

## Context

The project owner asked for an experimental, opt-in way to stop coding agents drifting from an agreed UI design, without shipping it to projects that have no frontend. The agreed design adds a sixth capability, kibi.check-policy.v1, to the plugin SDK: a plugin package names a JSON policy in its package.json and Kibi evaluates it itself under the canonical policy-ownership and policy-markers rules, so the boundary that keeps plugin code out of maintenance paths stays intact. A policy that cannot be read blocks instead of silently switching the rules off. The project owner agreed that this contract belongs in core.

## Source

> kibi.check-policy.v1 can be core.

Project owner, project thread on the UI design plugin, 2026-10-09.
