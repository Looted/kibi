---
title: kibi-claude reminds once at stop about unchecked edits and may ask before a firm-code edit
status: open
semantic_text: At session stop, kibi-claude hooks must remind the agent at most once about each edited source file that lacks a later impact check. Before an edit changes code that implements a current firm requirement, a kibi-claude hook may ask the person to confirm the tool call.
semantic_clauses:
  - At session stop, kibi-claude hooks must remind the agent at most once about each edited source file that lacks a later impact check.
  - Before an edit changes code that implements a current firm requirement, a kibi-claude hook may ask the person to confirm the tool call.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0111db94b79f65fff10b47580cca3f481b31b68e88ba6274c753f98d513f7aa8
semantic_inventory:
  - claim_key: CLAIM-6BD137F24FF5D674
    claim_text: At session stop, kibi-claude hooks must remind the agent at most once about each edited source file that lacks a later impact check
    role: normative
    status: modeled
    span:
      start: 0
      end: 131
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-4107EC64A4208A83
    claim_text: Before an edit changes code that implements a current firm requirement, a kibi-claude hook may ask the person to confirm the tool call
    role: normative
    status: modeled
    span:
      start: 133
      end: 267
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-6BD137F24FF5D674
  - CLAIM-4107EC64A4208A83
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-05T10:35:40.320Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - claude-code
  - plugin
  - hooks
  - progressive-disclosure
  - review:context-missing
id: REQ-claude-stop-reminder-and-firm-ask
type: req
---
At session stop, kibi-claude hooks must remind the agent at most once about each edited source file that lacks a later impact check. Before an edit changes code that implements a current firm requirement, a kibi-claude hook may ask the person to confirm the tool call.

## Context

The reminder names each edited file that no later impact check covered, and the firm-edit ask is left to the person.

What the kibi-claude package ships (its manifest, skills, MCP configuration and lifecycle hooks) is stated in REQ-claude-plugin-package, where each claim is proved from the package files. This requirement keeps the runtime behaviour of the hooks and the MCP endpoint.

## Why this changed

Split from REQ-claude-code-kibi-plugin-v1, which held four behaviors: staying an isolated, advisory package, staying silent in a project without a knowledge base, adding linked requirement context, and the stop reminder with the firm-edit ask. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
