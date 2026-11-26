---
title: The skills have the agent ask the person only for decisions
status: open
priority: must
firmness: firm
required_evidence: tested
semantic_text: The kibi-usage and kibi-decisions skills must tell the agent to ask the person only for a decision. The kibi-usage and kibi-decisions skills must say that a rule the person stated is approved by their own words.
tags:
  - skills
  - agent-guidance
  - approvals
origin:
  kind: human
  ref: 'Maintainer decision, 2026-11-26: ''Yeah, wording sign-offs are probably not necessary, only adding new firm requirements or changing, substantially changing existing ones. Wording changes are probably fine if the sense is the same.'' Asked whether stating a new rule counts as its sign-off, the maintainer chose ''Yes, my words are the sign-off''.'
  approved_by: maintainer
  recorded_at: '2026-11-26T11:21:15.000Z'
rationale: 'People should make only the big decisions. In the pilot benchmark the agent asked the person 30 questions on 63 ordinary work steps, against 5 for the closest other setup, and 27 of them were about Kibi''s own workflow: confirming the wording of a rule the person had just typed, approving the agent''s own keeps verdicts, giving a name for approved_by, or permission for a step a Kibi result had listed.'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 842f8f9cfa9724abb511dd37a0a97a5541b7e8f591977c3379e7d95b7e37abd7
semantic_inventory:
  - claim_key: CLAIM-BAEE08A47C1BF54B
    claim_text: The kibi-usage and kibi-decisions skills must tell the agent to ask the person only for a decision
    role: normative
    status: modeled
    span:
      start: 0
      end: 98
    subjects:
      - kibi.skills.bundled
  - claim_key: CLAIM-5E0F0535A817910C
    claim_text: The kibi-usage and kibi-decisions skills must say that a rule the person stated is approved by their own words
    role: normative
    status: modeled
    span:
      start: 100
      end: 210
    subjects:
      - kibi.skills.bundled
logic_claims:
  - CLAIM-BAEE08A47C1BF54B
  - CLAIM-5E0F0535A817910C
id: REQ-kibi-skills-ask-only-for-decisions
type: req
---
The kibi-usage and kibi-decisions skills must tell the agent to ask the person only for a decision. The kibi-usage and kibi-decisions skills must say that a rule the person stated is approved by their own words.

## Context

People should make only the big decisions. In the pilot benchmark the agent asked the person 30 questions on 63 ordinary work steps, against 5 for the closest other setup, and 27 of them were about Kibi's own workflow: confirming the wording of a rule the person had just typed, approving the agent's own keeps verdicts, giving a name for approved_by, or permission for a step a Kibi result had listed.

## Source

> Maintainer decision, 2026-11-26: 'Yeah, wording sign-offs are probably not necessary, only adding new firm requirements or changing, substantially changing existing ones. Wording changes are probably fine if the sense is the same.' Asked whether stating a new rule counts as its sign-off, the maintainer chose 'Yes, my words are the sign-off'.
