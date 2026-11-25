---
title: At level remember a tested or proved floor is reported, and a write may not raise one
status: open
priority: must
required_evidence: tested
tags:
  - levels
semantic_text: At level remember, kibi check must report a current requirement whose required_evidence is tested or proved as a non-blocking finding that names the level. At level remember, kb_upsert and kb_record must refuse a write that raises required_evidence to tested or proved, and say that a person chooses level test first.
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer decision, 2026-11-25, choosing Kibi levels as presets of how hard Kibi holds the agent to the requirements: "the idea of presets is how much do we force the agent"; "Remember / Test / Prove -> let''s go with this". Approving the Kibi level statements, statement 5 of 13: "Approve all as written".'
  recorded_at: '2026-11-25T09:46:23.774Z'
rationale: Level remember checks no scenario, test or proof, so a tested or proved floor is not enforced there. The approved two-layer plan reports such a floor and refuses new ones until a person chooses level test.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: e82539d201741accca0bf3207fbc789cbf3c1fb059569e483a15003935845b0d
semantic_inventory:
  - claim_key: CLAIM-2C0DF122E6FAD78A
    claim_text: At level remember, kibi check must report a current requirement whose required_evidence is tested or proved as a non-blocking finding that names the level
    role: normative
    status: modeled
    span:
      start: 0
      end: 154
    subjects:
      - kibi.level
    reason: Grounded by FACT-PROP-kibi-required-evidence-at-remember-c01 via requires_property.
  - claim_key: CLAIM-2686489AFACD6BAE
    claim_text: At level remember, kb_upsert and kb_record must refuse a write that raises required_evidence to tested or proved, and say that a person chooses level test first
    role: normative
    status: modeled
    span:
      start: 156
      end: 316
    subjects:
      - kibi.level
    reason: Grounded by FACT-PROP-kibi-required-evidence-at-remember-c02 via requires_property.
logic_claims:
  - CLAIM-2C0DF122E6FAD78A
  - CLAIM-2686489AFACD6BAE
id: REQ-kibi-required-evidence-at-remember
type: req
---
At level remember, kibi check must report a current requirement whose required_evidence is tested or proved as a non-blocking finding that names the level. At level remember, kb_upsert and kb_record must refuse a write that raises required_evidence to tested or proved, and say that a person chooses level test first.

## Context

Level remember checks no scenario, test or proof, so a tested or proved floor is not enforced there. The approved two-layer plan reports such a floor and refuses new ones until a person chooses level test.
