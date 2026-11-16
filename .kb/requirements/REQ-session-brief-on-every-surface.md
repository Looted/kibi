---
title: Every Kibi surface opens a session with the shared brief
status: open
priority: must
required_evidence: tested
semantic_text: The Claude Code, Codex, Cursor, OpenCode and ZCode adapters must open a Kibi session with the session brief from kibi-agent-core. The MCP initialize instructions and the kb_status result must carry the same session brief.
rationale: Codex and Cursor sessions started with no Kibi text at all, OpenCode added none for an active workspace, and an MCP client without hooks (Gemini CLI, any other client) only saw the server's own instructions. Serving the one brief from every adapter, the initialize instructions and kb_status means no surface depends on a hook to learn the policy.
tags:
  - agent-hosts
  - session-brief
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the W4 statements as worded in the statement file (decision card, 17:53Z). Requested as: Maintainer request, 2026-11-16: one short session brief in kibi-agent-core that every host adapter uses and that the MCP initialize instructions and kb_status serve, with three imperative lines (search for prior intent, record the person''s decisions with the reason, run the commit check) plus the conflict rule; and, since Gemini CLI reads GEMINI.md, have kibi init write the managed section there too.'
  recorded_at: '2026-11-16T17:00:00.000Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 43dbbdd3bd4f7f77f9b35f9c389ff2d79c82cbb38b4639eb0aafc46155fe74ae
semantic_inventory:
  - claim_key: CLAIM-7C854E50196B7D2B
    claim_text: The Claude Code, Codex, Cursor, OpenCode and ZCode adapters must open a Kibi session with the session brief from kibi-agent-core
    role: normative
    status: modeled
    span:
      start: 0
      end: 128
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-B2171289CBDC4BD3
    claim_text: The MCP initialize instructions and the kb_status result must carry the same session brief
    role: normative
    status: modeled
    span:
      start: 130
      end: 220
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-7C854E50196B7D2B
  - CLAIM-B2171289CBDC4BD3
id: REQ-session-brief-on-every-surface
type: req
---
The Claude Code, Codex, Cursor, OpenCode and ZCode adapters must open a Kibi session with the session brief from kibi-agent-core. The MCP initialize instructions and the kb_status result must carry the same session brief.

## Why

Codex and Cursor sessions started with no Kibi text at all, OpenCode added none for an active workspace, and an MCP client without hooks (Gemini CLI, any other client) only saw the server's own instructions. Serving the one brief from every adapter, the initialize instructions and kb_status means no surface depends on a hook to learn the policy.

## Source

> Maintainer request, 2026-11-16: one short session brief in kibi-agent-core that every host adapter uses and that the MCP initialize instructions and kb_status serve, with three imperative lines (search for prior intent, record the person's decisions with the reason, run the commit check) plus the conflict rule; and, since Gemini CLI reads GEMINI.md, have kibi init write the managed section there too.