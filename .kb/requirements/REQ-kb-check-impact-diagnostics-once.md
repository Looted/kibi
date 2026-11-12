---
title: kb_check returns each impact diagnostic once
status: open
priority: must
tags:
  - check
  - mcp
  - agent-facing
semantic_text: A kb_check result must list a diagnostic of its impact analysis under impactDiagnostics only.
origin:
  kind: agent
  ref: 'Maintainer request, 2026-11-12, after the review of release 2026.11.2 reported the findings: "Well, can you make a PR with a hotfix then?" and "Yes, do all post review work in the hotfix."; wording approved by the maintainer, 2026-11-12: "Approve"'
  approved_by: maintainer
  recorded_at: '2026-11-12T14:23:58.150Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 74f07a6c5db4a9d067ae9ca131aeaa1e524983806075cbb473abbd1047555995
semantic_inventory:
  - claim_key: CLAIM-195C380CC4EEDE1A
    claim_text: A kb_check result must list a diagnostic of its impact analysis under impactDiagnostics only
    role: normative
    status: ontology_gap
    span:
      start: 0
      end: 92
logic_claims:
  - CLAIM-195C380CC4EEDE1A
id: REQ-kb-check-impact-diagnostics-once
type: req
required_evidence: tested
---
A kb_check result must list a diagnostic of its impact analysis under impactDiagnostics only.

## Context

In the 2026.11.2 review a `kb_check` scoped to one large source file returned 364,000 characters of structured content and 124,000 of text, more than an agent host passes to the model. Each impact diagnostic was there three times: under `impactDiagnostics`, again under `qualityDiagnostics`, and again inside the evidence of its migration plan action, and the text printed it twice. Listing it once, with the plan action naming it and the text writing a shared suggestion once, removes the repetition without dropping a finding.

## Source

> Well, can you make a PR with a hotfix then?

> Yes, do all post review work in the hotfix.

Maintainer, 2026-11-12, in reply to the review of release 2026.11.2.
