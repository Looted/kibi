---
title: OpenCode runs the decision hooks the other hosts run
status: open
priority: should
tags:
  - opencode
  - hooks
rationale: OpenCode users got none of the rule capture and firm-rule protection the Claude Code, Codex, Cursor and ZCode hooks give, and every Kibi feature must work on every harness.
semantic_text: The OpenCode plugin must run the same decision guard as the Codex, Cursor and ZCode hooks, with the rule note, the capture template, the firm-edit stop and the idle capture request.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 1b3a471e725f02d7dbcdd2a8ee791426387dc3f68d9ca4f80edcb0f423dd95b7
semantic_inventory:
  - claim_key: CLAIM-A396A0163D636BDE
    claim_text: The OpenCode plugin must run the same decision guard as the Codex, Cursor and ZCode hooks, with the rule note, the capture template, the firm-edit stop and the idle capture request
    role: normative
    status: modeled
    span:
      start: 0
      end: 180
logic_claims:
  - CLAIM-A396A0163D636BDE
required_evidence: tested
origin:
  kind: agent
  ref: 'Maintainer approved this requirement on 2026-11-18 (pre-release host parity review).'
  approved_by: maintainer
  recorded_at: '2026-11-17T17:01:12.951Z'
id: REQ-opencode-decision-hooks
type: req
---
The OpenCode plugin must run the same decision guard as the Codex, Cursor and ZCode hooks, with the rule note, the capture template, the firm-edit stop and the idle capture request.

## Context

OpenCode users got none of the rule capture and firm-rule protection the Claude Code, Codex, Cursor and ZCode hooks give, and every Kibi feature must work on every harness.
