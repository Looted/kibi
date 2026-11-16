---
title: kibi init writes a GEMINI.md import of AGENTS.md
status: open
priority: must
required_evidence: tested
semantic_text: kibi init must write a managed GEMINI.md section that imports AGENTS.md, so Gemini CLI reads the Kibi agent instructions.
rationale: Gemini CLI loads GEMINI.md as its context file and reads AGENTS.md only when context.fileName is configured, so the Kibi section kibi init writes to AGENTS.md never reached it. Its memory import processor follows @./path imports, so one managed import keeps a single copy of the instructions.
tags:
  - init
  - agent-instructions
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the W4 statements as worded in the statement file (decision card, 17:53Z). Requested as: Maintainer request, 2026-11-16: one short session brief in kibi-agent-core that every host adapter uses and that the MCP initialize instructions and kb_status serve, with three imperative lines (search for prior intent, record the person''s decisions with the reason, run the commit check) plus the conflict rule; and, since Gemini CLI reads GEMINI.md, have kibi init write the managed section there too.'
  recorded_at: '2026-11-16T17:00:00.000Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 338df7a90f82aadcac58a57651634599467f03c2188e0749b6862d168e16e09a
semantic_inventory:
  - claim_key: CLAIM-1E7D264F62416CFB
    claim_text: kibi init must write a managed GEMINI.md section that imports AGENTS.md, so Gemini CLI reads the Kibi agent instructions
    role: normative
    status: modeled
    span:
      start: 0
      end: 120
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-1E7D264F62416CFB
id: REQ-init-gemini-instructions
type: req
---
kibi init must write a managed GEMINI.md section that imports AGENTS.md, so Gemini CLI reads the Kibi agent instructions.

## Why

Gemini CLI loads GEMINI.md as its context file and reads AGENTS.md only when context.fileName is configured, so the Kibi section kibi init writes to AGENTS.md never reached it. Its memory import processor follows @./path imports, so one managed import keeps a single copy of the instructions.

## Source

> Maintainer request, 2026-11-16: one short session brief in kibi-agent-core that every host adapter uses and that the MCP initialize instructions and kb_status serve, with three imperative lines (search for prior intent, record the person's decisions with the reason, run the commit check) plus the conflict rule; and, since Gemini CLI reads GEMINI.md, have kibi init write the managed section there too.