---
title: Kibi session brief names the three steps of a change and the conflict rule
status: open
priority: must
required_evidence: tested
semantic_text: The Kibi session brief must tell the agent to search for recorded intent before changing behaviour, to record the person's decisions with their reason, and to run the commit check before finishing. The Kibi session brief must say that a request that would make a recorded requirement or decision false is a question for the person, not a task.
rationale: Each host wrote its own session-start text, so a Claude Code agent, a Codex agent and an agent on a plain MCP client were told different things, and none of them was told all three steps that keep the knowledge base true. One short brief with the three steps and the conflict rule is the policy every surface shares; host lines add only what differs per host.
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
semantic_source_hash: b0a24d0a6d2b5361b4af1c61808377640d9256786f940a847147a2cd49e96888
semantic_inventory:
  - claim_key: CLAIM-CE38AF4C57C98CA5
    claim_text: The Kibi session brief must tell the agent to search for recorded intent before changing behaviour, to record the person's decisions with their reason, and to run the commit check before finishing
    role: normative
    status: modeled
    span:
      start: 0
      end: 196
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-A930044B42FFF3BD
    claim_text: The Kibi session brief must say that a request that would make a recorded requirement or decision false is a question for the person, not a task
    role: normative
    status: modeled
    span:
      start: 198
      end: 342
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-CE38AF4C57C98CA5
  - CLAIM-A930044B42FFF3BD
id: REQ-agent-core-session-brief
type: req
---
The Kibi session brief must tell the agent to search for recorded intent before changing behaviour, to record the person's decisions with their reason, and to run the commit check before finishing. The Kibi session brief must say that a request that would make a recorded requirement or decision false is a question for the person, not a task.

## Why

Each host wrote its own session-start text, so a Claude Code agent, a Codex agent and an agent on a plain MCP client were told different things, and none of them was told all three steps that keep the knowledge base true. One short brief with the three steps and the conflict rule is the policy every surface shares; host lines add only what differs per host.

## Source

> Maintainer request, 2026-11-16: one short session brief in kibi-agent-core that every host adapter uses and that the MCP initialize instructions and kb_status serve, with three imperative lines (search for prior intent, record the person's decisions with the reason, run the commit check) plus the conflict rule; and, since Gemini CLI reads GEMINI.md, have kibi init write the managed section there too.