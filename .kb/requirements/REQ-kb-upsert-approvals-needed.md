---
title: A requirement write lists what only the person can settle
status: open
priority: must
firmness: default
required_evidence: tested
tags:
  - kb_upsert
  - decision-capture
  - approvals
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-26: ''Yeah, wording sign-offs are probably not necessary, only adding new firm requirements or changing, substantially changing existing ones. Wording changes are probably fine if the sense is the same.'' Asked whether stating a new rule counts as its sign-off, the maintainer chose ''Yes, my words are the sign-off''.'
  approved_by: maintainer
  recorded_at: '2026-11-26T11:21:15.000Z'
rationale: In the crowded-store benchmark the agent asked the person one question per check result; listing every decision the person must make lets the agent ask once. In the pilot benchmark the agent then put the statement of a rule the person had just typed back to them for sign-off in 9 sessions; the person's quoted words, recorded as origin.ref, already approve it.
semantic_text: 'A requirement write''s result must list under approvalsNeeded every decision only the person can settle before the requirement reaches its evidence floor: each firm pair review''s approved_by, a new proof integration file, and a failure-side waiver as the alternative to the failure scenario. A requirement write''s result must not ask the person to sign off the statement of a rule they stated.'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a0d41f545bc9569eaca2272f0b2e5be185c197d84cc2f6fc82e2d2aaf824d842
semantic_inventory:
  - claim_key: CLAIM-98261BD569E579F4
    claim_text: 'A requirement write''s result must list under approvalsNeeded every decision only the person can settle before the requirement reaches its evidence floor: each firm pair review''s approved_by, a new proof integration file, and a failure-side waiver as the alternative to the failure scenario'
    role: normative
    status: modeled
    span:
      start: 0
      end: 289
    subjects:
      - mcp.kb_upsert
  - claim_key: CLAIM-A68590D9E2CB248F
    claim_text: A requirement write's result must not ask the person to sign off the statement of a rule they stated
    role: normative
    status: modeled
    span:
      start: 291
      end: 391
    subjects:
      - mcp.kb_upsert
logic_claims:
  - CLAIM-98261BD569E579F4
  - CLAIM-A68590D9E2CB248F
id: REQ-kb-upsert-approvals-needed
type: req
---
A requirement write's result must list under approvalsNeeded every decision only the person can settle before the requirement reaches its evidence floor: the statement signoff, each firm pair review's approved_by, a new proof integration file, and a failure-side waiver as the alternative to the failure scenario.

## Context

In the crowded-store benchmark the agent asked the person one question per check result; listing every decision the person must make lets the agent ask once.

## Source

> Maintainer decision, 2026-11-26: 'Yeah, wording sign-offs are probably not necessary, only adding new firm requirements or changing, substantially changing existing ones. Wording changes are probably fine if the sense is the same.' Asked whether stating a new rule counts as its sign-off, the maintainer chose 'Yes, my words are the sign-off'.
