---
title: Staged impact evidence is judged on the declarations a commit touches
status: open
priority: must
required_evidence: tested
semantic_text: kibi check --staged must not raise kibi_impact_evidence_missing for a staged file when every declaration the commit adds or changes in that file has a symbol record.
semantic_clauses:
  - kibi check --staged must not raise kibi_impact_evidence_missing for a staged file when every declaration the commit adds or changes in that file has a symbol record.
logic_claims:
  - CLAIM-880E2296A2D19722
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d7763ea13eb7535b2758256ee2551580e9fcf1031557b118555b899f977d32e2
semantic_inventory:
  - claim_key: CLAIM-880E2296A2D19722
    claim_text: kibi check --staged must not raise kibi_impact_evidence_missing for a staged file when every declaration the commit adds or changes in that file has a symbol record
    role: normative
    status: modeled
    span:
      start: 0
      end: 164
    reason: Grounded by the linked fact with this claim key.
tags:
  - staged-gate
  - symbols
  - impact
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
  approved_by: maintainer
  ref: 'Maintainer, in review on 2026-11-16: approved this requirement statement as written.'
id: REQ-staged-evidence-scoped-to-changed-declarations
type: req
---
kibi check --staged must not raise kibi_impact_evidence_missing for a staged file when every declaration the commit adds or changes in that file has a symbol record.

## Context

A benchmark run of agents working in an onboarded open-source repository showed the staged gate refusing 57% of correct commits. Onboarding records the code that decides each behavior, not every declaration, so most source files keep declarations without a symbol record; the gate demanded a record for every declaration in each staged file, and an agent whose change touched one function was blocked over neighbours it never edited. kibi_impact_evidence_missing was raised for every staged file whose declarations were not all recorded, so the same inherited gap blocked a commit twice. A file is covered when every declaration the commit adds or changes in it has a record; the rest is reported, not judged.

## Source

> Maintainer, in review on 2026-11-16: approved this requirement statement as written.
