---
title: kibi-zcode is an optional package backed by the project-local Kibi core, CLI and MCP
status: open
semantic_text: The kibi-zcode package must remain optional. Installing or enabling kibi-zcode must not modify core Kibi runtime components. Project-local Kibi logic used through kibi-zcode must remain provided by kibi-core. Project-local Kibi command workflows used through kibi-zcode must remain provided by kibi-cli. Project-local Kibi MCP operations used through kibi-zcode must remain provided by kibi-mcp. The kibi-zcode MCP configuration must resolve the project-local kibi-mcp binary.
semantic_clauses:
  - The kibi-zcode package must remain optional.
  - Installing or enabling kibi-zcode must not modify core Kibi runtime components.
  - Project-local Kibi logic used through kibi-zcode must remain provided by kibi-core.
  - Project-local Kibi command workflows used through kibi-zcode must remain provided by kibi-cli.
  - Project-local Kibi MCP operations used through kibi-zcode must remain provided by kibi-mcp.
  - The kibi-zcode MCP configuration must resolve the project-local kibi-mcp binary.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 2dfce4b361d2f97b9c32492836d5a564000719202732c5fcc3ce5b0f64a26422
semantic_inventory:
  - claim_key: CLAIM-BE46AFC52D56D8C6
    claim_text: The kibi-zcode package must remain optional
    role: normative
    status: modeled
    span:
      start: 0
      end: 43
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-3EA60FAD58B289BD
    claim_text: Installing or enabling kibi-zcode must not modify core Kibi runtime components
    role: normative
    status: modeled
    span:
      start: 45
      end: 123
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-2F4AE37AAF7B6983
    claim_text: Project-local Kibi logic used through kibi-zcode must remain provided by kibi-core
    role: normative
    status: modeled
    span:
      start: 125
      end: 207
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-AB3C17FC03076577
    claim_text: Project-local Kibi command workflows used through kibi-zcode must remain provided by kibi-cli
    role: normative
    status: modeled
    span:
      start: 209
      end: 302
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-90DE3F8567CC6DC9
    claim_text: Project-local Kibi MCP operations used through kibi-zcode must remain provided by kibi-mcp
    role: normative
    status: modeled
    span:
      start: 304
      end: 394
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-EBB199E9155E693A
    claim_text: The kibi-zcode MCP configuration must resolve the project-local kibi-mcp binary
    role: normative
    status: modeled
    span:
      start: 396
      end: 475
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-BE46AFC52D56D8C6
  - CLAIM-3EA60FAD58B289BD
  - CLAIM-2F4AE37AAF7B6983
  - CLAIM-AB3C17FC03076577
  - CLAIM-90DE3F8567CC6DC9
  - CLAIM-EBB199E9155E693A
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-05T10:15:19.021Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - kibi
  - zcode
  - plugin
  - mcp
  - review:context-missing
id: REQ-zcode-adapter-package
type: req
---
The kibi-zcode package must remain optional. Installing or enabling kibi-zcode must not modify core Kibi runtime components. Project-local Kibi logic used through kibi-zcode must remain provided by kibi-core. Project-local Kibi command workflows used through kibi-zcode must remain provided by kibi-cli. Project-local Kibi MCP operations used through kibi-zcode must remain provided by kibi-mcp. The kibi-zcode MCP configuration must resolve the project-local kibi-mcp binary.

## Context

Teams can use Kibi in ZCode without the plugin, and the plugin never brings its own copy of Kibi.

kibi-zcode is an optional ZCode adapter. Its hooks give advisory reminders and warnings only: they never write directly to .kb and never replace MCP tooling. The package is documented as optional and describes a supported manual MCP configuration. Its scope is declarative plugin assets and advisory hooks; the Kibi git hooks installed by kibi init keep ownership of hard enforcement.

What the package ships (its manifest, bootstrap command, skills, MCP launcher and lifecycle hooks) is stated in REQ-zcode-plugin-package, where each claim is proved from the package files.

## Why this changed

Split from REQ-zcode-kibi-plugin-v1, which held two behaviors: the optional package backed by the project-local Kibi packages, and staying silent in a project without a knowledge base. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
