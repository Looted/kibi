---
title: Codex, Cursor and ZCode stop hooks ask once for an unrecorded decision
status: open
semantic_text: When a session that changed source files stops without any kb_upsert write, the Codex, Cursor, ZCode stop hooks must ask the agent once per session to record the decision behind the change.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: de9f2fe1de6f56cbedfc2b349c2c6356b64f2d20aea7da771b054a8f34521435
semantic_inventory:
  - claim_key: CLAIM-0B8E0F35E08185E6
    claim_text: When a session that changed source files stops without any kb_upsert write, the Codex, Cursor, ZCode stop hooks must ask the agent once per session to record the decision behind the change
    role: condition
    status: modeled
    span:
      start: 0
      end: 188
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-0B8E0F35E08185E6
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"'
  approved_by: maintainer
  recorded_at: '2026-11-04T18:21:36.803Z'
priority: should
required_evidence: tested
tags:
  - hooks
  - codex
  - cursor
  - zcode
  - capture
id: REQ-agent-hosts-stop-capture
type: req
---
When a session that changed source files stops without any kb_upsert write, the Codex, Cursor, ZCode stop hooks must ask the agent once per session to record the decision behind the change.

## Context

The shared decision guard in kibi-agent-core decides when the stop hook asks.

The Claude Code plugin already asked before firm-requirement edits and asked for decisions to be recorded during the session; agents in the other hosts got neither, so the same drift (decisions implemented but not recorded, firm rules changed without asking) stayed possible there. The other hosts cannot put a call to the person from a hook (Codex has no ask, Cursor does not enforce one, and the ZCode adapter must stay advisory under REQ-zcode-advisory-enforcement-boundary-v1), so the firm-requirement guard is a notice to the agent. Cursor's prompt hook cannot add context, so its rule note rides on the next pre-edit message. The OpenCode plugin API offers no pre-edit context or stop follow-up hook, so it is not covered. KIBI_CONFIRM_FIRM_EDITS=0 turns the notice off on every host.

## Why this changed

Split from REQ-agent-hosts-decision-guard, which held three hook behaviors: the firm-edit ask, the rule prompt note and the stop capture. Each child is one of them.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"
