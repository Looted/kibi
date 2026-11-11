---
title: The JUnit, TAP and Playwright producers report what ran as kibi.proof-run.v1 and leave proof evaluation to Kibi
status: open
semantic_text: The JUnit, TAP and Playwright producers must report what ran as a kibi.proof-run.v1 artifact and leave proof evaluation to Kibi. The JUnit producer must not invent attempt history the XML does not contain.
semantic_clauses:
  - The JUnit, TAP and Playwright producers must report what ran as a kibi.proof-run.v1 artifact and leave proof evaluation to Kibi
  - The JUnit producer must not invent attempt history the XML does not contain
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 8afc880f31796bc9b100a49bb084bcd415c61fa2139cf56f450579dbe15716df
semantic_inventory:
  - claim_key: CLAIM-F90EB44C65C26BE5
    claim_text: The JUnit, TAP and Playwright producers must report what ran as a kibi.proof-run.v1 artifact and leave proof evaluation to Kibi
    role: normative
    status: modeled
    span:
      start: 0
      end: 127
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-FC1C6EB5CF76F5AA
    claim_text: The JUnit producer must not invent attempt history the XML does not contain
    role: normative
    status: modeled
    span:
      start: 129
      end: 204
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-F90EB44C65C26BE5
  - CLAIM-FC1C6EB5CF76F5AA
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the new-sentence children of the single-surface requirements in the KB gold-standard review (split batch 5): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T11:28:46.444Z'
firmness: firm
required_evidence: tested
priority: must
tags:
  - proof
  - producers
id: REQ-kibi-proof-producers
type: req
---
The JUnit, TAP and Playwright producers must report what ran as a kibi.proof-run.v1 artifact and leave proof evaluation to Kibi. The JUnit producer must not invent attempt history the XML does not contain.

## Context

Producers are reporters, not judges: the Playwright reporter records every attempt of every case with its native id, the JUnit and TAP adapters convert native reports into bound results, and Kibi alone applies the contract's success policy. JUnit XML records outcomes but not attempts, so a plain pass is reported with attempt history unavailable (only explicit rerun elements give a complete history), and the strict first-attempt policy then refuses it.

Carved out of REQ-kibi-verification-evidence-contract, which keeps the proof receipt contract as a whole; this child names what the first-party producers report.

## Source

> Maintainer decision, 2026-11-05, approving the new-sentence children of the single-surface requirements in the KB gold-standard review (split batch 5): "ok"
