---
title: kb_upsert says when a requirement it writes records no reason
status: open
priority: must
required_evidence: tested
firmness: default
tags:
  - upsert
  - rationale
semantic_text: kb_upsert must say that no reason is recorded when it creates or changes the statement or a grounded value of a human- or agent-authored requirement that has none.
rationale: In the benchmark the person gave a reason for a rule while it was being recorded, and the agent wrote the rule without it, so a later question about why found nothing. The write is the one moment the agent is already recording the decision, and Kibi cannot read the conversation from the CLI or MCP side on any host, so the write asks.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-16, approving the statements for the stale and split facts plan: "Approve all"'
  approved_by: maintainer
  recorded_at: '2026-11-16T14:58:17.839Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: f8bd5d9b15e0881207f5d7e34bc297500476811873c75aa9eeb76ec4e1cf86d1
semantic_inventory:
  - claim_key: CLAIM-20E5C5CB97A71CCE
    claim_text: kb_upsert must say that no reason is recorded when it creates or changes the statement or a grounded value of a human- or agent-authored requirement that has none
    role: normative
    status: modeled
    span:
      start: 0
      end: 162
logic_claims:
  - CLAIM-20E5C5CB97A71CCE
id: REQ-upsert-notes-missing-reason
type: req
---
kb_upsert must say that no reason is recorded when it creates or changes the statement or a grounded value of a human- or agent-authored requirement that has none.

## Context

In the benchmark the person gave a reason for a rule while it was being recorded, and the agent wrote the rule without it, so a later question about why found nothing. The write is the one moment the agent is already recording the decision, and Kibi cannot read the conversation from the CLI or MCP side on any host, so the write asks.

## Source

> Maintainer decision, 2026-11-16, approving the statements for the stale and split facts plan: "Approve all"