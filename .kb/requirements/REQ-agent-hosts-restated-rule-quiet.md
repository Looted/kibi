---
title: Rule notes skip a sentence that restates a recorded requirement
status: open
priority: must
firmness: default
required_evidence: tested
tags:
  - hooks
  - decision-capture
origin:
  kind: agent
  ref: 'Maintainer approval of the benchmark-driven capture, lookup and hook fixes, statement 7 of 8: ''Approve all''.'
  approved_by: maintainer
  recorded_at: '2026-11-24T20:00:22.793Z'
rationale: In the crowded-store benchmark the must nag fired on replies that restated an existing requirement, and the agent spent a paragraph explaining why it recorded nothing.
semantic_text: The prompt rule note and the stop-time capture reminder must skip a prompt sentence that only restates a current requirement, meaning that requirement's title or one sentence of its statement already says every topic word, number and negation in it.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: cfe2eccf38148777c8ab8886957f19d7b20ac93812e5c618a15637a67e53697a
semantic_inventory:
  - claim_key: CLAIM-560DB2E683AD9231
    claim_text: The prompt rule note and the stop-time capture reminder must skip a prompt sentence that only restates a current requirement, meaning that requirement's title or one sentence of its statement already says every topic word, number and negation in it
    role: normative
    status: modeled
    span:
      start: 0
      end: 248
    subjects:
      - kibi.agent_hosts_decision_guard
logic_claims:
  - CLAIM-560DB2E683AD9231
id: REQ-agent-hosts-restated-rule-quiet
type: req
---
The prompt rule note and the stop-time capture reminder must skip a prompt sentence that only restates a current requirement, meaning that requirement's title or one sentence of its statement already says every topic word, number and negation in it.

## Context

In the crowded-store benchmark the must nag fired on replies that restated an existing requirement, and the agent spent a paragraph explaining why it recorded nothing.

## Source

> Maintainer approval of the benchmark-driven capture, lookup and hook fixes, statement 7 of 8: 'Approve all'.
