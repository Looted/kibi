---
title: A kb_check impact diagnostic quotes a requirement statement once
status: open
firmness: default
priority: should
required_evidence: tested
tags:
  - check
  - mcp
  - cost
semantic_text: A kb_check impact diagnostic must quote a requirement statement once, in its evidence, and must not repeat it in its message.
origin:
  kind: agent
  ref: 'Maintainer approval, 2026-11-24, of the statement as worded: "All approved."'
  approved_by: maintainer
  recorded_at: '2026-11-24T19:21:27.834Z'
semantic_inventory:
  - claim_key: CLAIM-9FF6C3B57F76E6DE
    claim_text: A kb_check impact diagnostic must quote a requirement statement once, in its evidence, and must not repeat it in its message
    role: normative
    status: modeled
    span:
      start: 0
      end: 124
logic_claims:
  - CLAIM-9FF6C3B57F76E6DE
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: de0b6cfd70b698fc6d7e02fecb46782b19d1182f915abfc20f066c811c3413f5
rationale: Each requirement_statement_unverified diagnostic quoted the requirement statement in its message and again in evidence.statement. Together with repeated advice this made a kb_check scoped to packages/cli/src/search-answer.ts 67,112 characters, over the 64,000-character ceiling, so the check was refused and the agent editing that file got no result at all.
id: REQ-kb-check-impact-statement-quoted-once
type: req
---
A kb_check impact diagnostic must quote a requirement statement once, in its evidence, and must not repeat it in its message.

## Context

Each requirement_statement_unverified diagnostic quoted the requirement statement in its message and again in evidence.statement. Together with repeated advice this made a kb_check scoped to packages/cli/src/search-answer.ts 67,112 characters, over the 64,000-character ceiling, so the check was refused and the agent editing that file got no result at all.

## Source

> All approved.

Maintainer reply, 2026-11-24, to the four statements proposed for the second benchmark cost change.
