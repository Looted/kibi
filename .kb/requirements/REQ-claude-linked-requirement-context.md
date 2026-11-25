---
title: kibi-claude adds linked requirement IDs before a read or edit, within the read budgets
status: open
semantic_text: When the agent is about to read or edit a source file whose symbols are linked to requirements, kibi-claude hooks must add the linked requirement identifiers to the agent context within the read and search budgets. kibi-claude hooks must add at most one edit snippet per file per session and show each requirement in read and search rows at most once per session.
semantic_clauses:
  - When the agent is about to read or edit a source file whose symbols are linked to requirements, kibi-claude hooks must add the linked requirement identifiers to the agent context within the read and search budgets.
  - kibi-claude hooks must add at most one edit snippet per file per session and show each requirement in read and search rows at most once per session.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 172ed150418be4697f3e1a5c6f7c140fa51160174f5bb03527964246c5d567e8
semantic_inventory:
  - claim_key: CLAIM-460DE66BAC3D6B1F
    claim_text: When the agent is about to read or edit a source file whose symbols are linked to requirements, kibi-claude hooks must add the linked requirement identifiers to the agent context within the read and search budgets
    role: condition
    status: modeled
    span:
      start: 0
      end: 213
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-1D67CD90FBCD6C63
    claim_text: kibi-claude hooks must add at most one edit snippet per file per session and show each requirement in read and search rows at most once per session
    role: normative
    status: modeled
    span:
      start: 215
      end: 362
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-460DE66BAC3D6B1F
  - CLAIM-1D67CD90FBCD6C63
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok" Maintainer approval of the read and search hook statements built on the Nov 25 cost analysis, changed statements (clause 1 within the read and search budgets): ''Approve all as worded''.'
  approved_by: maintainer
  recorded_at: '2026-11-05T10:33:46.957Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - claude-code
  - plugin
  - hooks
  - progressive-disclosure
id: REQ-claude-linked-requirement-context
type: req
---
When the agent is about to read or edit a source file whose symbols are linked to requirements, kibi-claude hooks must add the linked requirement identifiers to the agent context within the read and search budgets. kibi-claude hooks must add at most one edit snippet per file per session and show each requirement in read and search rows at most once per session.

## Context

The agent sees which requirements the code in view serves before it changes it, without the same requirement repeating.

What the kibi-claude package ships (its manifest, skills, MCP configuration and lifecycle hooks) is stated in REQ-claude-plugin-package, where each claim is proved from the package files. This requirement keeps the runtime behaviour of the hooks and the MCP endpoint. The rows, their budgets and the once-per-session rule are stated for every host in REQ-hook-read-rows-in-view, REQ-hook-read-row-budgets and the requirements beside them.

## Why this changed

Split from REQ-claude-code-kibi-plugin-v1, which held four behaviors: staying an isolated, advisory package, staying silent in a project without a knowledge base, adding linked requirement context, and the stop reminder with the firm-edit ask. Each child is one of them.

Reads now show compact rows for the symbols in view within per-event and per-session budgets instead of one snippet per file, so a requirement already shown this session, or a file over budget, may add nothing (clause 1), and a second read of another part of the same file may show the rows of other symbols, while each requirement is still shown once and edit snippets stay one per file (clause 2).

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
>
> Maintainer approval of the read and search hook statements built on the Nov 25 cost analysis, changed statements (clause 1 within the read and search budgets): 'Approve all as worded'.
