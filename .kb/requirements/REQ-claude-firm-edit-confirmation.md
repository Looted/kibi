---
title: Edits of a firm requirement's code are confirmed by the person before they land
status: open
required_evidence: tested
priority: must
tags:
  - hooks
  - claude-code
  - firmness
semantic_text: Before an edit tool call or an in-place shell write changes a symbol that implements a current firm requirement, the kibi-claude PreToolUse hook must ask the person to confirm the call, naming the symbol and the requirement, unless a matching keeps receipt for that requirement and symbol exists. After the person allows an edit that changes a firm requirement, the hook must not ask about that requirement again in the same session.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 71b7f35b533a52ccb119a7d26cb2ec78319c5bad8dd630363fc527ffde9f1d58
semantic_inventory:
  - claim_key: CLAIM-A47B63A0D7149A1C
    claim_text: Before an edit tool call or an in-place shell write changes a symbol that implements a current firm requirement, the kibi-claude PreToolUse hook must ask the person to confirm the call, naming the symbol and the requirement, unless a matching keeps receipt for that requirement and symbol exists
    role: exception
    status: modeled
    span:
      start: 0
      end: 295
  - claim_key: CLAIM-3451CCB02BE8F626
    claim_text: After the person allows an edit that changes a firm requirement, the hook must not ask about that requirement again in the same session
    role: normative
    status: modeled
    span:
      start: 297
      end: 432
logic_claims:
  - CLAIM-A47B63A0D7149A1C
  - CLAIM-3451CCB02BE8F626
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer decision, 2026-11-16, approving the firm-edit receipt statements: "Yes, all of them"'
  recorded_at: '2026-11-16T07:01:30.335Z'
id: REQ-claude-firm-edit-confirmation
type: req
semantic_clauses:
  - Before an edit tool call or an in-place shell write changes a symbol that implements a current firm requirement, the kibi-claude PreToolUse hook must ask the person to confirm the call, naming the symbol and the requirement, unless a matching keeps receipt for that requirement and symbol exists.
  - After the person allows an edit that changes a firm requirement, the hook must not ask about that requirement again in the same session.
---
Before an edit tool call or an in-place shell write changes a symbol that implements a current firm requirement, the kibi-claude PreToolUse hook must ask the person to confirm the call, naming the symbol and the requirement, unless a matching keeps receipt for that requirement and symbol exists. After the person allows an edit that changes a firm requirement, the hook must not ask about that requirement again in the same session.

## Context

Agents shown the governing requirement before an edit still made the edit, then reported that the knowledge base now contradicted the code. Firm requirements are the decisions an agent must not override on its own, so the hook turns the snippet into a question for the person at the moment the code would change, while the reasoning that led to the edit is still in context.

## Source

Maintainer: an agent should respect recorded decisions during the work, not after it, because by then the context may have drifted.

## Why this changed

The first sentence now exempts an edit that a matching keeps receipt covers. An agent records that receipt with kibi review-firm-edit after reading the changed code against the requirement, and the staged commit gate (REQ-kibi-staged-firm-edit-gate) enforces the rule on every host. Asking the person about an edit the agent has already judged as keeping the rule caused false stops. A receipt lapses as soon as the statement or the code changes.

> Maintainer decision, 2026-11-16, approving the firm-edit receipt statements: "Yes, all of them"
