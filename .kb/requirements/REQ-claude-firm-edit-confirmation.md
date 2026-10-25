---
title: Edits of a firm requirement's code are confirmed by the person before they land
status: open
required_evidence: tested
priority: must
tags:
  - hooks
  - claude-code
  - firmness
semantic_text: Before an edit tool call or an in-place shell write changes a symbol that implements a current firm requirement, the kibi-claude PreToolUse hook must ask the person to confirm the call, naming the symbol and the requirement. After the person allows an edit that changes a firm requirement, the hook must not ask about that requirement again in the same session.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 51500344311eae2f8bb02c70369037122df9ace09745cf53be66a9bbc0539147
semantic_inventory:
  - claim_key: CLAIM-29AC5BA71037614C
    claim_text: Before an edit tool call or an in-place shell write changes a symbol that implements a current firm requirement, the kibi-claude PreToolUse hook must ask the person to confirm the call, naming the symbol and the requirement
    role: normative
    status: modeled
    span:
      start: 0
      end: 223
  - claim_key: CLAIM-3451CCB02BE8F626
    claim_text: After the person allows an edit that changes a firm requirement, the hook must not ask about that requirement again in the same session
    role: normative
    status: modeled
    span:
      start: 225
      end: 360
logic_claims:
  - CLAIM-29AC5BA71037614C
  - CLAIM-3451CCB02BE8F626
origin:
  kind: agent
  recorded_at: '2026-10-14T16:57:37.649Z'
id: REQ-claude-firm-edit-confirmation
type: req
---
Before an edit tool call or an in-place shell write changes a symbol that implements a current firm requirement, the kibi-claude PreToolUse hook must ask the person to confirm the call, naming the symbol and the requirement. After the person allows an edit that changes a firm requirement, the hook must not ask about that requirement again in the same session.

## Context

Agents shown the governing requirement before an edit still made the edit, then reported that the knowledge base now contradicted the code. Firm requirements are the decisions an agent must not override on its own, so the hook turns the snippet into a question for the person at the moment the code would change, while the reasoning that led to the edit is still in context.

## Source

Maintainer: an agent should respect recorded decisions during the work, not after it, because by then the context may have drifted.
