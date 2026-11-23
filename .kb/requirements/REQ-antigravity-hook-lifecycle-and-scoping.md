---
firmness: default
origin:
  approved_by: maintainer
  kind: agent
  recorded_at: '2026-11-23T06:15:17Z'
  ref: 'Maintainer decision, 2026-11-23, approving the Antigravity plugin requirements signoff: "All approved."'
priority: must
status: open
tags:
  - antigravity
  - hooks
  - progressive-disclosure
title: kibi-antigravity hooks deliver snippets, ask on firm edits, remind on stop, and restrict non-Kibi approvals
rationale: Antigravity requires an explicit decision from PreToolUse hooks and delivers model context through PreInvocation injectSteps, so Kibi hooks must handle progressive-disclosure snippets, firm-edit confirmation, stop reminders, and safe non-Kibi permission scoping.
semantic_text: In an opted-in Kibi workspace, kibi-antigravity hooks must parse Antigravity protojson payloads, inject the session brief and queued progressive-disclosure file snippets on PreInvocation, ask before editing code that implements a firm requirement, and remind once at stop about unchecked source edits. Outside a Kibi workspace, kibi-antigravity hooks must remain silent and must not auto-approve mutating or shell tool calls.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0af7658db640e240732670e24cb572108b71d88ef38ba2c0fe22d1871ca8899a
semantic_inventory:
  - claim_key: CLAIM-918637098805FE7D
    claim_text: In an opted-in Kibi workspace, kibi-antigravity hooks must parse Antigravity protojson payloads, inject the session brief and queued progressive-disclosure file snippets on PreInvocation, ask before editing code that implements a firm requirement, and remind once at stop about unchecked source edits
    role: normative
    status: modeled
    span:
      start: 0
      end: 300
    subjects:
      - antigravity.kibi_plugin
  - claim_key: CLAIM-515D5A82192BFC40
    claim_text: Outside a Kibi workspace, kibi-antigravity hooks must remain silent and must not auto-approve mutating or shell tool calls
    role: normative
    status: modeled
    span:
      start: 302
      end: 424
    subjects:
      - antigravity.kibi_plugin
logic_claims:
  - CLAIM-918637098805FE7D
  - CLAIM-515D5A82192BFC40
id: REQ-antigravity-hook-lifecycle-and-scoping
type: req
---
In an opted-in Kibi workspace, kibi-antigravity hooks must parse Antigravity protojson payloads, inject the session brief and queued progressive-disclosure file snippets on PreInvocation, ask before editing code that implements a firm requirement, and remind once at stop about unchecked source edits. Outside a Kibi workspace, kibi-antigravity hooks must remain silent and must not auto-approve mutating or shell tool calls.

## Context

Antigravity requires an explicit decision from PreToolUse hooks and delivers model context through PreInvocation injectSteps, so Kibi hooks must handle progressive-disclosure snippets, firm-edit confirmation, stop reminders, and safe non-Kibi permission scoping.
