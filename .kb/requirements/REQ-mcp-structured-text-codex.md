---
title: Codex receives each discovery result once; Cursor and Gemini CLI keep the text copy
status: open
priority: must
required_evidence: tested
semantic_text: A discovery tool result sent to Codex must carry the text summary alone without a copy of the data JSON. A discovery tool result sent to Cursor or Gemini CLI must carry the data JSON before the text summary unless KIBI_MCP_STRUCTURED_TEXT says otherwise.
rationale: Codex gives the model the serialized structuredContent in place of the text part whenever a result carries both, so a data copy in the text never reached it and only the summary was lost. Gemini CLI and Cursor give the model the text part only, so the data JSON has to stay in it for them.
tags:
  - mcp
  - search-lane
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the W4 statements as worded in the statement file (decision card, 17:53Z). Requested as: Maintainer request, 2026-11-16: list six MCP tools by default and the rest under a full profile chosen by configuration, an environment variable or a flag, with the bootstrap tools also listed while the knowledge base is empty; advertise about 15 kb_upsert capture fields and point to the operation-fields resource for the rest; resolve the double delivery of discovery results by what each host forwards; and list each kibi --help command by the first sentence of its description.'
  recorded_at: '2026-11-16T20:00:00.000Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 3dad36f0c43612d40eb2efb14b911d3c6ad7c2de93ea5bd2c4f13c3a8df23c16
semantic_inventory:
  - claim_key: CLAIM-6BDE8F498A781697
    claim_text: A discovery tool result sent to Codex must carry the text summary alone without a copy of the data JSON
    role: normative
    status: modeled
    span:
      start: 0
      end: 103
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-CB946A3370B7F1BE
    claim_text: A discovery tool result sent to Cursor or Gemini CLI must carry the data JSON before the text summary unless KIBI_MCP_STRUCTURED_TEXT says otherwise
    role: exception
    status: modeled
    span:
      start: 105
      end: 253
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-6BDE8F498A781697
  - CLAIM-CB946A3370B7F1BE
id: REQ-mcp-structured-text-codex
type: req
---
A discovery tool result sent to Codex must carry the text summary alone without a copy of the data JSON. A discovery tool result sent to Cursor or Gemini CLI must carry the data JSON before the text summary unless KIBI_MCP_STRUCTURED_TEXT says otherwise.

## Why

Codex gives the model the serialized structuredContent in place of the text part whenever a result carries both, so a data copy in the text never reached it and only the summary was lost. Gemini CLI and Cursor give the model the text part only, so the data JSON has to stay in it for them.

## Source

> Maintainer request, 2026-11-16: list six MCP tools by default and the rest under a full profile chosen by configuration, an environment variable or a flag, with the bootstrap tools also listed while the knowledge base is empty; advertise about 15 kb_upsert capture fields and point to the operation-fields resource for the rest; resolve the double delivery of discovery results by what each host forwards; and list each kibi --help command by the first sentence of its description.