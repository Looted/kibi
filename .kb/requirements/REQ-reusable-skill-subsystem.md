---
id: REQ-reusable-skill-subsystem
title: Reusable Markdown Skill Subsystem for Agent Guidance
status: open
created_at: 2026-05-29T00:00:00.000Z
updated_at: 2026-05-29T00:00:00.000Z
source: packages/cli/src/public/skills.ts
priority: must
tags:
  - cli
  - skills
  - umbrella
links:
  - type: specified_by
    target: SCEN-reusable-skill-subsystem
  - type: verified_by
    target: TEST-skill-cli-load-validate
semantic_text: The CLI exposes reusable bundled Markdown skills and validates their manifests/resources before surfacing them to agents.
logic_claims:
  - CLAIM-9B9967E9775967AE
semantic_clauses:
  - The CLI exposes reusable bundled Markdown skills and validates their manifests/resources before surfacing them to agents
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 6a468431c2bae361bf6c0104ae37d795425800a4cfaf1e826082ef8f70fa472a
semantic_inventory:
  - claim_key: CLAIM-9B9967E9775967AE
    claim_text: The CLI exposes reusable bundled Markdown skills and validates their manifests/resources before surfacing them to agents
    role: normative
    status: modeled
    span:
      start: 0
      end: 120
type: req
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Firmness relabelled to default until reviewed. Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Maintainer decision, 2026-11-11, approving entity context that was inferred (not recorded in history) in the KB gold-standard review (context batch 9, inferred): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
firmness: default
required_evidence: tested
---

The CLI exposes reusable bundled Markdown skills and validates their manifests/resources before surfacing them to agents.

## Why
Agent guidance used to be long prompts copied into each host, and they drifted apart. Bundled, validated skills give every host the same guidance from one source. Inferred from: changeset "canonical-skill-guidance": "agent guidance stays in one place and cannot drift".
