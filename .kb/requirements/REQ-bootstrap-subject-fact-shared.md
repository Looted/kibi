---
title: Bootstrap plans write one subject fact per subject key
status: open
priority: must
tags:
  - bootstrap
  - modeling
  - naming
semantic_text: Bootstrap planning must write one subject fact for each subject key and link every requirement about that subject to it. Bootstrap planning must report each subject key that claims from several sources share.
semantic_clauses:
  - Bootstrap planning must write one subject fact for each subject key and link every requirement about that subject to it.
  - Bootstrap planning must report each subject key that claims from several sources share.
logic_claims:
  - CLAIM-B8DB90CDAE3ACFE9
  - CLAIM-ED3A9A64EB821F3F
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 6c063cd3404ef61118291480ca0edc56a0cb750493930ac1ef56ad250b613a7a
semantic_inventory:
  - claim_key: CLAIM-B8DB90CDAE3ACFE9
    claim_text: Bootstrap planning must write one subject fact for each subject key and link every requirement about that subject to it
    role: normative
    status: modeled
    span:
      start: 0
      end: 119
  - claim_key: CLAIM-ED3A9A64EB821F3F
    claim_text: Bootstrap planning must report each subject key that claims from several sources share
    role: normative
    status: modeled
    span:
      start: 121
      end: 207
origin:
  kind: agent
  recorded_at: '2026-10-08T15:34:35.481Z'
id: REQ-bootstrap-subject-fact-shared
type: req
---
Bootstrap planning must write one subject fact for each subject key and link every requirement about that subject to it. Bootstrap planning must report each subject key that claims from several sources share.

## Context

A bootstrap plan for a test project held 95 subject facts for 93 subject keys: two subjects were named by claims from two sources each (a handoff document and a ticket, or two tickets), and the subject key registry correctly gave both claims the same key, but the plan still minted one subject fact per claim. `kb_check` then reported `subject-key-identity` and asked the operator to merge the facts by hand. The plan now writes the subject fact once, links each requirement to it, and keeps every source's provenance on it.

## Source

Onboarding evaluation round 7 analysis (2026-10-08), finding K12.