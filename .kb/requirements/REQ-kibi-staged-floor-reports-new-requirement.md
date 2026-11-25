---
title: At level test the commit gate reports, and does not refuse, a requirement the commit adds below its floor
status: open
priority: must
required_evidence: tested
tags:
  - levels
semantic_text: At level test, kibi check --staged must report, and not fail, a requirement the commit adds whose evidence is below its floor.
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer decision, 2026-11-25, choosing Kibi levels as presets of how hard Kibi holds the agent to the requirements: "the idea of presets is how much do we force the agent"; "Remember / Test / Prove -> let''s go with this". Approving the Kibi level statements, statement 6 of 13: "Approve all as written".'
  recorded_at: '2026-11-25T09:46:26.172Z'
rationale: 'The approved two-layer plan does not block the commit that records a new requirement: the requirement is reported below its floor, and its proof can follow in later commits.'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 68e4a8d89ff7f72a9268c971a62cb4218aaa59832844ff9ad56542eef2595825
semantic_inventory:
  - claim_key: CLAIM-8893E6FB7E89E684
    claim_text: At level test, kibi check --staged must report, and not fail, a requirement the commit adds whose evidence is below its floor
    role: normative
    status: modeled
    span:
      start: 0
      end: 125
    subjects:
      - kibi.level
    reason: Grounded by FACT-PROP-kibi-staged-floor-reports-new-requirement-c01 via requires_property.
logic_claims:
  - CLAIM-8893E6FB7E89E684
id: REQ-kibi-staged-floor-reports-new-requirement
type: req
---
At level test, kibi check --staged must report, and not fail, a requirement the commit adds whose evidence is below its floor.

## Context

The approved two-layer plan does not block the commit that records a new requirement: the requirement is reported below its floor, and its proof can follow in later commits.
