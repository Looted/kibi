---
title: Codex, Cursor and ZCode pre-edit hooks ask before an edit of firm code
status: open
semantic_text: Before an edit changes code that implements a current firm requirement, the Codex, Cursor, ZCode pre-edit hooks must tell the agent to ask the person before an edit that breaks that rule, once per requirement per session.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 5c1ededb1204df632125b393b9e5a149320d73e71b968168faee7aab99e92559
semantic_inventory:
  - claim_key: CLAIM-24C16C22D1A2FAC8
    claim_text: Before an edit changes code that implements a current firm requirement, the Codex, Cursor, ZCode pre-edit hooks must tell the agent to ask the person before an edit that breaks that rule, once per requirement per session
    role: normative
    status: modeled
    span:
      start: 0
      end: 220
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-24C16C22D1A2FAC8
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"'
  approved_by: maintainer
  recorded_at: '2026-11-04T18:20:35.769Z'
priority: should
required_evidence: tested
tags:
  - hooks
  - codex
  - cursor
  - zcode
  - capture
id: REQ-agent-hosts-firm-edit-ask
type: req
---
Before an edit changes code that implements a current firm requirement, the Codex, Cursor, ZCode pre-edit hooks must tell the agent to ask the person before an edit that breaks that rule, once per requirement per session.

## Context

The shared decision guard in kibi-agent-core decides the notice; each host hook calls it.

The Claude Code plugin already asked before firm-requirement edits and asked for decisions to be recorded during the session; agents in the other hosts got neither, so the same drift (decisions implemented but not recorded, firm rules changed without asking) stayed possible there. The other hosts cannot put a call to the person from a hook (Codex has no ask, Cursor does not enforce one, and the ZCode adapter must stay advisory under REQ-zcode-advisory-enforcement-boundary-v1), so the firm-requirement guard is a notice to the agent. Cursor's prompt hook cannot add context, so its rule note rides on the next pre-edit message. The OpenCode plugin API offers no pre-edit context or stop follow-up hook, so it is not covered. KIBI_CONFIRM_FIRM_EDITS=0 turns the notice off on every host.

## Why this changed

Split from REQ-agent-hosts-decision-guard, which held three hook behaviors: the firm-edit ask, the rule prompt note and the stop capture. Each child is one of them.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"
