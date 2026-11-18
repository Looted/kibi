---
title: Codex, Cursor and ZCode pre-edit hooks ask before an edit of firm code
status: open
semantic_text: Before an edit changes code that implements a current firm requirement, the Codex, Cursor, ZCode pre-edit hooks must tell the agent, once per requirement per session, to ask the person before an edit that breaks that rule and to record its verdict with kb_review_firm_edit.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 1a2d9071782f046b5326f8c512dc89cab8aade1d46904fd689c7ed4a1de78427
semantic_inventory:
  - claim_key: CLAIM-E5D7DA26835ED6C3
    claim_text: Before an edit changes code that implements a current firm requirement, the Codex, Cursor, ZCode pre-edit hooks must tell the agent, once per requirement per session, to ask the person before an edit that breaks that rule and to record its verdict with kb_review_firm_edit
    role: normative
    status: modeled
    span:
      start: 0
      end: 272
logic_claims:
  - CLAIM-E5D7DA26835ED6C3
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer-approved statement (2026-11-17): "Before an edit changes code that implements a current firm requirement, the Codex, Cursor, ZCode pre-edit hooks must tell the agent, once per requirement per session, to ask the person before an edit that breaks that rule and to record its verdict with kb_review_firm_edit."'
  recorded_at: '2026-11-17T15:06:42.369Z'
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
semantic_clauses:
  - Before an edit changes code that implements a current firm requirement, the Codex, Cursor, ZCode pre-edit hooks must tell the agent, once per requirement per session, to ask the person before an edit that breaks that rule and to record its verdict with kb_review_firm_edit.
---
Before an edit changes code that implements a current firm requirement, the Codex, Cursor, ZCode pre-edit hooks must tell the agent, once per requirement per session, to ask the person before an edit that breaks that rule and to record its verdict with kb_review_firm_edit.

## Context

The shared decision guard in kibi-agent-core decides the notice; each host hook calls it.

The Claude Code plugin already asked before firm-requirement edits and asked for decisions to be recorded during the session; agents in the other hosts got neither, so the same drift (decisions implemented but not recorded, firm rules changed without asking) stayed possible there. The other hosts cannot put a call to the person from a hook (Codex has no ask, Cursor does not enforce one, and the ZCode adapter must stay advisory under REQ-zcode-advisory-enforcement-boundary-v1), so the firm-requirement guard is a notice to the agent. Cursor's prompt hook cannot add context, so its rule note rides on the next pre-edit message. The OpenCode plugin API offers no pre-edit context or stop follow-up hook, so it is not covered. KIBI_CONFIRM_FIRM_EDITS=0 turns the notice off on every host.

## Why this changed

Nov 16 2026: the notice now also tells the agent to record its keeps-or-changes verdict with kibi review-firm-edit, and it is skipped for a requirement whose touched code a current keeps receipt covers. The staged commit gate (REQ-kibi-staged-firm-edit-gate) reads that receipt on every host.

Split from REQ-agent-hosts-decision-guard, which held three hook behaviors: the firm-edit ask, the rule prompt note and the stop capture. Each child is one of them.

## Source

> Maintainer decision, 2026-11-16, approving the firm-edit receipt statements: "Yes, all of them"

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"
