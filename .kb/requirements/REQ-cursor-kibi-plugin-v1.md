---
id: REQ-cursor-kibi-plugin-v1
title: 'Cursor Kibi Plugin v1: Optional MCP adapter package'
status: open
created_at: 2026-06-09T00:00:00.000Z
updated_at: 2026-06-09T00:00:00.000Z
source: packages/cursor/
priority: must
owner: cursor-team
tags:
  - kibi
  - cursor
  - plugin
  - mcp
  - review:context-missing
links:
  - type: specified_by
    target: SCEN-cursor-kibi-plugin-v1
  - type: verified_by
    target: TEST-cursor-kibi-plugin-v1
semantic_text: The kibi-cursor package must remain optional. When kibi-cursor is installed or enabled, it must not modify core Kibi runtime components. The kibi-cursor MCP launcher must start the project-local kibi-mcp binary. kibi-cursor hooks must only emit reminders and warnings. kibi-cursor hooks must not write to the .kb directory. The kibi-cursor documentation must describe a manual MCP configuration for teams that do not use the plugin installer.
logic_claims:
  - CLAIM-53B43B16D3EB8252
  - CLAIM-6B1861EAA48FF0C3
  - CLAIM-DBFE455AFAFC2F35
  - CLAIM-915BBD5BF9462870
  - CLAIM-E5CB2AA3485D7A30
  - CLAIM-25D92215ADE7D7CB
semantic_clauses:
  - The kibi-cursor package must remain optional.
  - When kibi-cursor is installed or enabled, it must not modify core Kibi runtime components.
  - The kibi-cursor MCP launcher must start the project-local kibi-mcp binary.
  - kibi-cursor hooks must only emit reminders and warnings.
  - kibi-cursor hooks must not write to the .kb directory.
  - The kibi-cursor documentation must describe a manual MCP configuration for teams that do not use the plugin installer.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 4e67f186a82ed41a91ce34cd629077f4ff17f90201a9efd17f2297bfe4d15588
semantic_inventory:
  - claim_key: CLAIM-53B43B16D3EB8252
    claim_text: The kibi-cursor package must remain optional
    role: normative
    status: modeled
    span:
      start: 0
      end: 44
  - claim_key: CLAIM-6B1861EAA48FF0C3
    claim_text: When kibi-cursor is installed or enabled, it must not modify core Kibi runtime components
    role: condition
    status: modeled
    span:
      start: 46
      end: 135
  - claim_key: CLAIM-DBFE455AFAFC2F35
    claim_text: The kibi-cursor MCP launcher must start the project-local kibi-mcp binary
    role: normative
    status: modeled
    span:
      start: 137
      end: 210
  - claim_key: CLAIM-915BBD5BF9462870
    claim_text: kibi-cursor hooks must only emit reminders and warnings
    role: normative
    status: modeled
    span:
      start: 212
      end: 267
  - claim_key: CLAIM-E5CB2AA3485D7A30
    claim_text: kibi-cursor hooks must not write to the .kb directory
    role: normative
    status: modeled
    span:
      start: 269
      end: 322
  - claim_key: CLAIM-25D92215ADE7D7CB
    claim_text: The kibi-cursor documentation must describe a manual MCP configuration for teams that do not use the plugin installer
    role: normative
    status: modeled
    span:
      start: 324
      end: 441
type: req
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof."'
  approved_by: maintainer
  recorded_at: '2026-10-27T07:51:58.946Z'
firmness: firm
---
The kibi-cursor package must remain optional. When kibi-cursor is installed or enabled, it must not modify core Kibi runtime components. The kibi-cursor MCP launcher must start the project-local kibi-mcp binary. kibi-cursor hooks must only emit reminders and warnings. kibi-cursor hooks must not write to the .kb directory. The kibi-cursor documentation must describe a manual MCP configuration for teams that do not use the plugin installer.

## Context

kibi-cursor integrates Kibi with Cursor through a plugin manifest, rules, skills, commands, advisory hooks and an MCP launcher. What the package publishes is stated in REQ-cursor-plugin-package, where each claim is proved from the package files. This requirement keeps the adapter's runtime behaviour.

## Why this changed

The migrated statement was a single paragraph that the advisor read as one claim. On 2026-10-27 it was restated as one claim per sentence, and the packaging claims moved to REQ-cursor-plugin-package so that they can be proved from the package files. The foundation claim is now the peer dependency claim there: kibi-cursor declares kibi-cli and kibi-mcp, kibi-cli brings kibi-core, and SWI-Prolog is bundled on Linux and macOS.
