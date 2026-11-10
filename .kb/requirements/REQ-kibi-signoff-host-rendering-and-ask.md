---
title: Host integrations render the signoff view and their stop hooks ask for it once after a requirement write
status: open
semantic_text: The Kibi Claude Code, OpenCode and VS Code integrations must show a fenced signoff view as rendered text instead of a raw code block. The Kibi Claude Code, Codex, Cursor and ZCode stop hooks must ask once for the signoff view when a session wrote a requirement after the last kibi signoff run.
semantic_clauses:
  - The Kibi Claude Code, OpenCode and VS Code integrations must show a fenced signoff view as rendered text instead of a raw code block
  - The Kibi Claude Code, Codex, Cursor and ZCode stop hooks must ask once for the signoff view when a session wrote a requirement after the last kibi signoff run
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: fab5f03de1ea570652b5594f8b0502df8b597a8f4effdaa8c55f4c4ba343ff5a
semantic_inventory:
  - claim_key: CLAIM-1BE21B0FB39D22F2
    claim_text: The Kibi Claude Code, OpenCode and VS Code integrations must show a fenced signoff view as rendered text instead of a raw code block
    role: normative
    status: modeled
    span:
      start: 0
      end: 132
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-65ED97AB98F70C91
    claim_text: The Kibi Claude Code, Codex, Cursor and ZCode stop hooks must ask once for the signoff view when a session wrote a requirement after the last kibi signoff run
    role: normative
    status: modeled
    span:
      start: 134
      end: 292
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-1BE21B0FB39D22F2
  - CLAIM-65ED97AB98F70C91
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T09:02:03.998Z'
priority: should
firmness: default
required_evidence: tested
tags:
  - cli
  - signoff
  - hosts
id: REQ-kibi-signoff-host-rendering-and-ask
type: req
---
The Kibi Claude Code, OpenCode and VS Code integrations must show a fenced signoff view as rendered text instead of a raw code block. The Kibi Claude Code, Codex, Cursor and ZCode stop hooks must ask once for the signoff view when a session wrote a requirement after the last kibi signoff run.

## Context

Hosts that can render the view show it as text, and a session that wrote a requirement is asked once for signoff before it ends, never repeatedly.

Signoff is where a person reads what a change does to the recorded requirements before agreeing, so the view must be complete, readable wherever it lands, and offered when requirements were written.

## Why this changed

Split from REQ-kibi-signoff-views, which held three behaviors: what the signoff view lists, where it is written and how it is printed, and how host integrations render it and ask for it. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
