---
title: Codex, Cursor and ZCode hooks guard firm rules and capture stated decisions
status: open
required_evidence: tested
priority: should
tags:
  - hooks
  - codex
  - cursor
  - zcode
  - capture
semantic_text: Before an edit changes code that implements a current firm requirement, the Codex, Cursor, ZCode pre-edit hooks must tell the agent to ask the person before an edit that breaks that rule, once per requirement per session. When a submitted prompt reads as a rule, the Codex, Cursor, ZCode hooks must give the agent the note that recording the rule with kb_upsert is part of the change. When a session that changed source files stops without any kb_upsert write, the Codex, Cursor, ZCode stop hooks must ask the agent once per session to record the decision behind the change.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: dae03ae747c3f4ceaab918bd0eaa2b30c89edd61f52696a721161ec921977277
semantic_inventory:
  - claim_key: CLAIM-24C16C22D1A2FAC8
    claim_text: Before an edit changes code that implements a current firm requirement, the Codex, Cursor, ZCode pre-edit hooks must tell the agent to ask the person before an edit that breaks that rule, once per requirement per session
    role: normative
    status: modeled
    span:
      start: 0
      end: 220
  - claim_key: CLAIM-764840ECA62AFC1F
    claim_text: When a submitted prompt reads as a rule, the Codex, Cursor, ZCode hooks must give the agent the note that recording the rule with kb_upsert is part of the change
    role: condition
    status: modeled
    span:
      start: 222
      end: 383
  - claim_key: CLAIM-0B8E0F35E08185E6
    claim_text: When a session that changed source files stops without any kb_upsert write, the Codex, Cursor, ZCode stop hooks must ask the agent once per session to record the decision behind the change
    role: condition
    status: modeled
    span:
      start: 385
      end: 573
logic_claims:
  - CLAIM-24C16C22D1A2FAC8
  - CLAIM-764840ECA62AFC1F
  - CLAIM-0B8E0F35E08185E6
origin:
  kind: agent
  recorded_at: '2026-10-14T17:46:17.070Z'
id: REQ-agent-hosts-decision-guard
type: req
---
Before an edit changes code that implements a current firm requirement, the Codex, Cursor, ZCode pre-edit hooks must tell the agent to ask the person before an edit that breaks that rule, once per requirement per session. When a submitted prompt reads as a rule, the Codex, Cursor, ZCode hooks must give the agent the note that recording the rule with kb_upsert is part of the change. When a session that changed source files stops without any kb_upsert write, the Codex, Cursor, ZCode stop hooks must ask the agent once per session to record the decision behind the change.

## Context

The Claude Code plugin already asked before firm-requirement edits and asked for decisions to be recorded during the session; agents in the other hosts got neither, so the same drift (decisions implemented but not recorded, firm rules changed without asking) stayed possible there. The other hosts cannot put a call to the person from a hook (Codex has no ask, Cursor does not enforce one, and the ZCode adapter must stay advisory under REQ-zcode-advisory-enforcement-boundary-v1), so the firm-requirement guard is a notice to the agent. Cursor's prompt hook cannot add context, so its rule note rides on the next pre-edit message. The OpenCode plugin API offers no pre-edit context or stop follow-up hook, so it is not covered. KIBI_CONFIRM_FIRM_EDITS=0 turns the notice off on every host.

## Source

Maintainer: an agent should respect recorded decisions during the work, not after it, and whatever is worth fixing in the hooks should be fixed.
