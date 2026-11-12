---
title: Staged impact diagnostics and paths
status: open
priority: must
firmness: default
semantic_text: A staged impact diagnostic shall be kibi_impact_evidence_missing or symbols_manifest_stale. The symbols manifest shall be .kb/symbols.yaml. The symbol coordinates file shall be .kb/symbol-coordinates.yaml. The entity schema guide shall be docs/entity-schema.md.
semantic_clauses:
  - A staged impact diagnostic shall be kibi_impact_evidence_missing or symbols_manifest_stale.
  - The symbols manifest shall be .kb/symbols.yaml.
  - The symbol coordinates file shall be .kb/symbol-coordinates.yaml.
  - The entity schema guide shall be docs/entity-schema.md.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?" Firmness relabelled to default until reviewed. Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested."'
  approved_by: maintainer
  recorded_at: '2026-10-28T18:56:42.464Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 6056174a981d735e5eb3231414bf10424ef63c0e7f8cc7096ea899592fd4b011
semantic_inventory:
  - claim_key: CLAIM-F99938945F5E84C3
    claim_text: A staged impact diagnostic shall be kibi_impact_evidence_missing or symbols_manifest_stale
    role: normative
    status: modeled
    span:
      start: 0
      end: 90
  - claim_key: CLAIM-41E5DF73D62AB2AA
    claim_text: The symbols manifest shall be .kb/symbols.yaml
    role: normative
    status: modeled
    span:
      start: 92
      end: 138
  - claim_key: CLAIM-CA13B6BD6887ECD6
    claim_text: The symbol coordinates file shall be .kb/symbol-coordinates.yaml
    role: normative
    status: modeled
    span:
      start: 140
      end: 204
  - claim_key: CLAIM-7CE10A9A659DEC27
    claim_text: The entity schema guide shall be docs/entity-schema.md
    role: normative
    status: modeled
    span:
      start: 206
      end: 260
logic_claims:
  - CLAIM-F99938945F5E84C3
  - CLAIM-41E5DF73D62AB2AA
  - CLAIM-CA13B6BD6887ECD6
  - CLAIM-7CE10A9A659DEC27
id: REQ-staged-impact-identifiers
type: req
required_evidence: tested
---
A staged impact diagnostic shall be kibi_impact_evidence_missing or symbols_manifest_stale. The symbols manifest shall be .kb/symbols.yaml. The symbol coordinates file shall be .kb/symbol-coordinates.yaml. The entity schema guide shall be docs/entity-schema.md.

## Context

REQ-cli-staged-impact-enforcement blocks a staged change that touches code without Kibi evidence. It reports one of a closed list of diagnostics, reads the symbol manifest and its derived coordinates, points at the entity schema guide and, because it has no waiver line, a note cannot excuse a behavior edit. They are stated here so every value is proved against its constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"