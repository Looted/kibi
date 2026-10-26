---
title: Rules the person states are recorded during the session
status: open
required_evidence: tested
priority: must
tags:
  - hooks
  - claude-code
  - capture
semantic_text: When a prompt reads as a rule or decision, the kibi-claude UserPromptSubmit hook must tell the agent that recording the rule with kb_upsert is part of the change. When a session that changed source files reaches its stop without any kb_upsert write, the kibi-claude Stop hook must ask the agent once per session to record the decision the person stated or to say there was none.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0ac17ea1770da4f0e13d96db4ec068a23aa79f59b733fed9188ebf59a1b0c017
semantic_inventory:
  - claim_key: CLAIM-7C2ABDC5442B9D18
    claim_text: When a prompt reads as a rule or decision, the kibi-claude UserPromptSubmit hook must tell the agent that recording the rule with kb_upsert is part of the change
    role: condition
    status: modeled
    span:
      start: 0
      end: 161
  - claim_key: CLAIM-7B28D337C59D5BCE
    claim_text: When a session that changed source files reaches its stop without any kb_upsert write, the kibi-claude Stop hook must ask the agent once per session to record the decision the person stated or to say there was none
    role: condition
    status: modeled
    span:
      start: 163
      end: 377
logic_claims:
  - CLAIM-7C2ABDC5442B9D18
  - CLAIM-7B28D337C59D5BCE
origin:
  kind: agent
  recorded_at: '2026-10-14T16:57:41.453Z'
id: REQ-claude-decision-capture-nudges
type: req
---
When a prompt reads as a rule or decision, the kibi-claude UserPromptSubmit hook must tell the agent that recording the rule with kb_upsert is part of the change. When a session that changed source files reaches its stop without any kb_upsert write, the kibi-claude Stop hook must ask the agent once per session to record the decision the person stated or to say there was none.

## Context

Agents implemented decisions the person stated and recorded none of them, so later sessions found no record of the decision and changed the behavior back. The hooks already surfaced recorded rules but nothing asked for new ones to be recorded.

## Source

Maintainer: an agent should respect recorded decisions during the work, not after it, because by then the context may have drifted.
