---
title: kibi-cursor hooks only remind and warn, and never write to .kb
status: open
semantic_text: kibi-cursor hooks must only emit reminders and warnings. kibi-cursor hooks must not write to the .kb directory.
semantic_clauses:
  - kibi-cursor hooks must only emit reminders and warnings.
  - kibi-cursor hooks must not write to the .kb directory.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: f6012ce373b690aace0e881238806553fab40a752dae12a4b5fa7346496f45b8
semantic_inventory:
  - claim_key: CLAIM-915BBD5BF9462870
    claim_text: kibi-cursor hooks must only emit reminders and warnings
    role: normative
    status: modeled
    span:
      start: 0
      end: 55
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-E5CB2AA3485D7A30
    claim_text: kibi-cursor hooks must not write to the .kb directory
    role: normative
    status: modeled
    span:
      start: 57
      end: 110
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-915BBD5BF9462870
  - CLAIM-E5CB2AA3485D7A30
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-05T10:01:22.707Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - kibi
  - cursor
  - plugin
  - mcp
  - review:context-missing
owner: cursor-team
id: REQ-cursor-hook-limits
type: req
---
kibi-cursor hooks must only emit reminders and warnings. kibi-cursor hooks must not write to the .kb directory.

## Context

Hooks only advise, and their session state lives outside the knowledge base.

kibi-cursor integrates Kibi with Cursor through a plugin manifest, rules, skills, commands, advisory hooks and an MCP launcher. What the package publishes is stated in REQ-cursor-plugin-package, where each claim is proved from the package files. This requirement keeps the adapter's runtime behaviour.

## Why this changed

Split from REQ-cursor-kibi-plugin-v1, which held two behaviors: the optional package with its MCP launcher, and the limits on what its hooks do. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
