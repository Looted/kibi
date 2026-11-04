---
title: Host hooks decide paths, Kibi MCP calls and the knowledge index through shared agent-core functions
status: open
priority: must
firmness: firm
tags:
  - hooks
  - agent-core
  - claude
  - codex
  - cursor
  - zcode
semantic_text: The Claude Code, Codex, Cursor and ZCode hooks must classify workspace paths, recognize Kibi MCP tool calls and load the knowledge index through the shared kibi-agent-core functions, so every host reaches the same decision for the same input.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the shared agent-core hook inputs requirement drafted in the KB gold-standard review (decisions round 2, item 3): "Agree to all."'
  approved_by: maintainer
  recorded_at: '2026-11-04T14:36:46.537Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d5ceb4a4ff3c0df848a33ffba649c15eb1f41f2addad2b90871850daa12d414c
semantic_inventory:
  - claim_key: CLAIM-DF64F5F40C65E752
    claim_text: The Claude Code, Codex, Cursor and ZCode hooks must classify workspace paths, recognize Kibi MCP tool calls and load the knowledge index through the shared kibi-agent-core functions, so every host reaches the same decision for the same input
    role: normative
    status: modeled
    reason: Grounded by a property fact counting host hooks that decide these inputs outside kibi-agent-core.
    span:
      start: 0
      end: 241
logic_claims:
  - CLAIM-DF64F5F40C65E752
id: REQ-agent-core-shared-hook-inputs
type: req
proof_exempt: true
proof_exempt_reason: 'A source structure contract: which module a host hook takes a decision from is visible in the host sources, not in packed behavior (the Claude Code hooks ship as one bundle). Verified by the shared hook input contract test (TEST-agent-core-shared-hook-inputs); each host''s packed e2e test exercises the decisions themselves.'
---
The Claude Code, Codex, Cursor and ZCode hooks must classify workspace paths, recognize Kibi MCP tool calls and load the knowledge index through the shared kibi-agent-core functions, so every host reaches the same decision for the same input.

## Context

The Claude Code, Codex, Cursor and ZCode hooks each decide from the same three inputs: the class of an edited workspace path, whether a tool call is a Kibi MCP call, and the knowledge index of linked symbols. kibi-agent-core holds one function for each, so the four hosts cannot drift apart. This requirement owns those shared functions in place of linking each one to all four host requirements.

## Source

> Maintainer decision, 2026-11-04, approving the shared agent-core hook inputs requirement drafted in the KB gold-standard review (decisions round 2, item 3): "Agree to all."
