---
id: REQ-zcode-kibi-plugin-v1
title: 'ZCode Kibi Plugin v1: Optional MCP adapter package'
status: open
created_at: 2026-09-15T00:00:00.000Z
updated_at: 2026-09-15T00:00:00.000Z
source: packages/zcode/
priority: must
tags:
  - kibi
  - zcode
  - plugin
  - mcp
  - review:context-missing
links:
  - type: specified_by
    target: SCEN-zcode-kibi-plugin-v1
  - type: verified_by
    target: TEST-zcode-kibi-plugin-v1
semantic_text: The kibi-zcode package must remain optional. Installing or enabling kibi-zcode must not modify core Kibi runtime components. Project-local Kibi logic used through kibi-zcode must remain provided by kibi-core. Project-local Kibi command workflows used through kibi-zcode must remain provided by kibi-cli. Project-local Kibi MCP operations used through kibi-zcode must remain provided by kibi-mcp. The kibi-zcode MCP configuration must resolve the project-local kibi-mcp binary. When the resolved project root does not own .kb/manifest.json, kibi-zcode hooks must emit no output. When the resolved project root does not own .kb/manifest.json, the kibi-zcode MCP endpoint must expose no tools.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
type: req
semantic_source_hash: 1679d01b48a2cf1427e8fd4ba7bb0f2a609b7e6a8b8865ca9c9de2be7c49507a
semantic_inventory:
  - claim_key: CLAIM-BE46AFC52D56D8C6
    claim_text: The kibi-zcode package must remain optional
    role: normative
    status: modeled
    span:
      start: 0
      end: 43
  - claim_key: CLAIM-3EA60FAD58B289BD
    claim_text: Installing or enabling kibi-zcode must not modify core Kibi runtime components
    role: normative
    status: modeled
    span:
      start: 45
      end: 123
  - claim_key: CLAIM-2F4AE37AAF7B6983
    claim_text: Project-local Kibi logic used through kibi-zcode must remain provided by kibi-core
    role: normative
    status: modeled
    span:
      start: 125
      end: 207
  - claim_key: CLAIM-AB3C17FC03076577
    claim_text: Project-local Kibi command workflows used through kibi-zcode must remain provided by kibi-cli
    role: normative
    status: modeled
    span:
      start: 209
      end: 302
  - claim_key: CLAIM-90DE3F8567CC6DC9
    claim_text: Project-local Kibi MCP operations used through kibi-zcode must remain provided by kibi-mcp
    role: normative
    status: modeled
    span:
      start: 304
      end: 394
  - claim_key: CLAIM-EBB199E9155E693A
    claim_text: The kibi-zcode MCP configuration must resolve the project-local kibi-mcp binary
    role: normative
    status: modeled
    span:
      start: 396
      end: 475
  - claim_key: CLAIM-D736785D7DF3106F
    claim_text: When the resolved project root does not own .kb/manifest.json, kibi-zcode hooks must emit no output
    role: condition
    status: modeled
    span:
      start: 477
      end: 576
  - claim_key: CLAIM-A0E2B1D45E38797C
    claim_text: When the resolved project root does not own .kb/manifest.json, the kibi-zcode MCP endpoint must expose no tools
    role: condition
    status: modeled
    span:
      start: 578
      end: 689
logic_claims:
  - CLAIM-BE46AFC52D56D8C6
  - CLAIM-3EA60FAD58B289BD
  - CLAIM-2F4AE37AAF7B6983
  - CLAIM-AB3C17FC03076577
  - CLAIM-90DE3F8567CC6DC9
  - CLAIM-EBB199E9155E693A
  - CLAIM-D736785D7DF3106F
  - CLAIM-A0E2B1D45E38797C
semantic_clauses:
  - The kibi-zcode package must remain optional.
  - Installing or enabling kibi-zcode must not modify core Kibi runtime components.
  - Project-local Kibi logic used through kibi-zcode must remain provided by kibi-core.
  - Project-local Kibi command workflows used through kibi-zcode must remain provided by kibi-cli.
  - Project-local Kibi MCP operations used through kibi-zcode must remain provided by kibi-mcp.
  - The kibi-zcode MCP configuration must resolve the project-local kibi-mcp binary.
  - When the resolved project root does not own .kb/manifest.json, kibi-zcode hooks must emit no output.
  - When the resolved project root does not own .kb/manifest.json, the kibi-zcode MCP endpoint must expose no tools.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof."'
  approved_by: maintainer
  recorded_at: '2026-10-27T08:36:10.769Z'
firmness: firm
---
The kibi-zcode package must remain optional. Installing or enabling kibi-zcode must not modify core Kibi runtime components. Project-local Kibi logic used through kibi-zcode must remain provided by kibi-core. Project-local Kibi command workflows used through kibi-zcode must remain provided by kibi-cli. Project-local Kibi MCP operations used through kibi-zcode must remain provided by kibi-mcp. The kibi-zcode MCP configuration must resolve the project-local kibi-mcp binary. When the resolved project root does not own .kb/manifest.json, kibi-zcode hooks must emit no output. When the resolved project root does not own .kb/manifest.json, the kibi-zcode MCP endpoint must expose no tools.

## Context

kibi-zcode is an optional ZCode adapter. Its hooks give advisory reminders and warnings only: they never write directly to .kb and never replace MCP tooling. The package is documented as optional and describes a supported manual MCP configuration. Its scope is declarative plugin assets and advisory hooks; the Kibi git hooks installed by kibi init keep ownership of hard enforcement.

What the package ships (its manifest, bootstrap command, skills, MCP launcher and lifecycle hooks) is stated in REQ-zcode-plugin-package, where each claim is proved from the package files.

## Why this changed

On 2026-10-27 the packaging claims moved to REQ-zcode-plugin-package so that they can be proved from the files the package publishes, and the MCP resolver claim was reworded to name the project-local kibi-mcp binary.
