---
firmness: default
origin:
  approved_by: maintainer
  kind: agent
  recorded_at: '2026-11-23T06:15:17Z'
  ref: 'Maintainer decision, 2026-11-23, approving the Antigravity plugin requirements signoff: "All approved."'
priority: must
status: open
tags:
  - antigravity
  - hooks
title: kibi-antigravity persists per-conversation hook state and queued snippets in an append-only session journal
rationale: Antigravity invokes parallel tool calls and lacks additionalContext on PreToolUse/PostToolUse, so snippets and hook memory must be stored in an append-only per-conversation journal and drained on PreInvocation.
semantic_text: kibi-antigravity must persist per-conversation hook state in an append-only JSONL session journal under a workspace-and-session scoped directory so parallel tool calls retain dedupe, pending-edit, firm-confirmation, and queued-context events.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 4895965bc4810eaa3afb7eb6fc93deec52b5f80fe9d187adc1851485e79d23c4
semantic_inventory:
  - claim_key: CLAIM-4C96FA3C35B54E63
    claim_text: kibi-antigravity must persist per-conversation hook state in an append-only JSONL session journal under a workspace-and-session scoped directory so parallel tool calls retain dedupe, pending-edit, firm-confirmation, and queued-context events
    role: normative
    status: modeled
    span:
      start: 0
      end: 241
    subjects:
      - antigravity.kibi_plugin
logic_claims:
  - CLAIM-4C96FA3C35B54E63
id: REQ-antigravity-session-journal
type: req
required_evidence: tested
---
kibi-antigravity must persist per-conversation hook state in an append-only JSONL session journal under a workspace-and-session scoped directory so parallel tool calls retain dedupe, pending-edit, firm-confirmation, and queued-context events.

## Context

Antigravity invokes parallel tool calls and lacks additionalContext on PreToolUse/PostToolUse, so snippets and hook memory must be stored in an append-only per-conversation journal and drained on PreInvocation.
