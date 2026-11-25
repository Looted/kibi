---
title: A plain kibi check runs the knowledge rules at every Kibi level and the verification rules only at test
status: open
priority: must
firmness: firm
required_evidence: tested
tags:
  - check
  - rules
  - levels
semantic_text: A plain kibi check must run the canonical and advisory rules of the knowledge layer and skip migration rules. A plain kibi check must run the canonical and advisory rules of the verification layer only when the project's Kibi level is test. Repository configuration must not disable a single check rule. kibi check must report advisory and migration rule findings as non-blocking quality diagnostics and fail only on canonical rule findings.
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer decision, 2026-11-25, splitting Kibi into a knowledge layer that is always on and a verification layer with levels: "the first layer is building the knowledge base and you ignore all the proof and quality. Then turning on proof is the second layer." Choosing the presets: "Remember / Test / Prove -> let''s go with this". Approving the Kibi level statements, statement 2 of 13, which replaces REQ-kibi-check-rule-selection: "Approve all as written".'
  recorded_at: '2026-11-25T09:44:10.821Z'
rationale: 'The maintainer wants Kibi levels to set how hard Kibi pushes the agent: "the idea of presets is how much do we force the agent". At level remember Kibi still records requirements, links them to code and catches contradictions; the rules that ask for scenarios, tests and proofs run only at level test.'
semantic_clauses:
  - A plain kibi check must run the canonical and advisory rules of the knowledge layer and skip migration rules
  - A plain kibi check must run the canonical and advisory rules of the verification layer only when the project's Kibi level is test
  - Repository configuration must not disable a single check rule
  - kibi check must report advisory and migration rule findings as non-blocking quality diagnostics and fail only on canonical rule findings
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 3cbc32beb222d6363e825b3eafc31366ef7a2babebe76e2f4a63d91d2b1ec3b2
semantic_inventory:
  - claim_key: CLAIM-DEEE2FC9A1ADE79B
    claim_text: A plain kibi check must run the canonical and advisory rules of the knowledge layer and skip migration rules
    role: normative
    status: modeled
    span:
      start: 0
      end: 108
    subjects:
      - kibi.check.rule_selection
    reason: Grounded by FACT-PROP-kibi-check-rule-selection-by-level-c01 via requires_property.
  - claim_key: CLAIM-8DAC8A9FD5263C20
    claim_text: A plain kibi check must run the canonical and advisory rules of the verification layer only when the project's Kibi level is test
    role: normative
    status: modeled
    span:
      start: 110
      end: 239
    subjects:
      - kibi.check.rule_selection
    reason: Grounded by FACT-PROP-kibi-check-rule-selection-by-level-c02 via requires_property.
  - claim_key: CLAIM-316C8E24D77449BA
    claim_text: Repository configuration must not disable a single check rule
    role: normative
    status: modeled
    span:
      start: 241
      end: 302
    subjects:
      - kibi.check.rule_selection
    reason: Grounded by FACT-PROP-kibi-check-rule-selection-by-level-c03 via requires_property.
  - claim_key: CLAIM-12B95C2196450B63
    claim_text: kibi check must report advisory and migration rule findings as non-blocking quality diagnostics and fail only on canonical rule findings
    role: normative
    status: modeled
    span:
      start: 304
      end: 440
    subjects:
      - kibi.check.rule_selection
    reason: Grounded by FACT-PROP-kibi-check-rule-selection-c03 via requires_property.
logic_claims:
  - CLAIM-DEEE2FC9A1ADE79B
  - CLAIM-8DAC8A9FD5263C20
  - CLAIM-316C8E24D77449BA
  - CLAIM-12B95C2196450B63
id: REQ-kibi-check-rule-selection-by-level
type: req
---
A plain kibi check must run the canonical and advisory rules of the knowledge layer and skip migration rules. A plain kibi check must run the canonical and advisory rules of the verification layer only when the project's Kibi level is test. Repository configuration must not disable a single check rule. kibi check must report advisory and migration rule findings as non-blocking quality diagnostics and fail only on canonical rule findings.

## Context

The maintainer wants Kibi levels to set how hard Kibi pushes the agent: "the idea of presets is how much do we force the agent". At level remember Kibi still records requirements, links them to code and catches contradictions; the rules that ask for scenarios, tests and proofs run only at level test. This requirement replaces REQ-kibi-check-rule-selection, which ran every canonical and advisory rule at all times.

## Why this changed

REQ-kibi-check-rule-selection ran every canonical and advisory rule on every project, so a project could not keep its requirements without also being asked for scenarios, tests and proofs. The maintainer chose levels ("Remember / Test / Prove -> let's go with this"), so the verification rules now run only at level test, and test stays the default so the old behaviour is kept unless a person chooses remember.
