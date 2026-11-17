---
title: Edits of a firm requirement's code are confirmed by the person before they land
status: open
required_evidence: tested
priority: must
tags:
  - hooks
  - claude-code
  - firmness
semantic_text: Before an edit tool call or an in-place shell write changes a symbol that implements a current firm requirement, the kibi-claude PreToolUse hook must ask the person to confirm the call, naming the symbol and the requirement, unless a matching keeps receipt for that requirement and symbol was recorded after the same session asked about that edit. After the person allows an edit that changes a firm requirement, the hook must not ask about that requirement again in the same session.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 4226564bce21dffd9b1d7d40e67473b9235f19eb04b414cd2ebf1f9ce0e31175
semantic_inventory:
  - claim_key: CLAIM-C9266BA8EE977E6F
    claim_text: Before an edit tool call or an in-place shell write changes a symbol that implements a current firm requirement, the kibi-claude PreToolUse hook must ask the person to confirm the call, naming the symbol and the requirement, unless a matching keeps receipt for that requirement and symbol was recorded after the same session asked about that edit
    role: exception
    status: modeled
    span:
      start: 0
      end: 346
  - claim_key: CLAIM-3451CCB02BE8F626
    claim_text: After the person allows an edit that changes a firm requirement, the hook must not ask about that requirement again in the same session
    role: normative
    status: modeled
    span:
      start: 348
      end: 483
logic_claims:
  - CLAIM-C9266BA8EE977E6F
  - CLAIM-3451CCB02BE8F626
origin:
  kind: agent
  ref: 'Owner decision, 2026-11-16 (relayed): a committed keeps receipt must no longer skip the firm-edit question on later edits; the hooks honour a receipt only in the session that was asked or for a retry of the same edit. Maintainer decision, 2026-11-17, approving the reworded statement: "Approved".'
  recorded_at: '2026-11-16T21:06:43.498Z'
  approved_by: maintainer
id: REQ-claude-firm-edit-confirmation
type: req
semantic_clauses:
  - Before an edit tool call or an in-place shell write changes a symbol that implements a current firm requirement, the kibi-claude PreToolUse hook must ask the person to confirm the call, naming the symbol and the requirement, unless a matching keeps receipt for that requirement and symbol was recorded after the same session asked about that edit.
  - After the person allows an edit that changes a firm requirement, the hook must not ask about that requirement again in the same session.
---
Before an edit tool call or an in-place shell write changes a symbol that implements a current firm requirement, the kibi-claude PreToolUse hook must ask the person to confirm the call, naming the symbol and the requirement, unless a matching keeps receipt for that requirement and symbol was recorded after the same session asked about that edit. After the person allows an edit that changes a firm requirement, the hook must not ask about that requirement again in the same session.

## Context

Agents shown the governing requirement before an edit still made the edit, then reported that the knowledge base now contradicted the code. Firm requirements are the decisions an agent must not override on its own, so the hook turns the snippet into a question for the person at the moment the code would change, while the reasoning that led to the edit is still in context.

## Source

Maintainer: an agent should respect recorded decisions during the work, not after it, because by then the context may have drifted.

## Why this changed

A keeps receipt is the agent's judgment on one edit. As first written, a committed receipt that still matched the code silenced the question for every later edit of that symbol, in every later session. The receipt now counts only when it was recorded after the same session asked about the edit, which is the retry of that edit in a run where nobody could answer. A new session editing the symbol is asked again. The staged commit gate (REQ-kibi-staged-firm-edit-gate) still needs a current keeps receipt at commit time.

> Owner decision, 2026-11-16 (relayed): a committed keeps receipt must no longer skip the firm-edit question on later edits; the hooks honour a receipt only in the session that was asked or for a retry of the same edit.
