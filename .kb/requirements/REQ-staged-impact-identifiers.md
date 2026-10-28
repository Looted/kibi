---
title: Staged impact diagnostics and paths
status: open
priority: must
firmness: firm
semantic_text: 'A staged impact diagnostic shall be kibi_impact_evidence_missing, symbols_manifest_stale or kibi_impact_override_missing_rationale. The no impact declaration shall be Kibi-Impact: none. The symbols manifest shall be .kb/symbols.yaml. The symbol coordinates file shall be .kb/symbol-coordinates.yaml. The entity schema guide shall be docs/entity-schema.md.'
semantic_clauses:
  - A staged impact diagnostic shall be kibi_impact_evidence_missing, symbols_manifest_stale or kibi_impact_override_missing_rationale.
  - 'The no impact declaration shall be Kibi-Impact: none.'
  - The symbols manifest shall be .kb/symbols.yaml.
  - The symbol coordinates file shall be .kb/symbol-coordinates.yaml.
  - The entity schema guide shall be docs/entity-schema.md.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T18:56:42.464Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c78e718b87ba38dddec09d69e74e87425bda02d39198aecfb61c12be33e01ec7
semantic_inventory:
  - claim_key: CLAIM-5DCC5375F28A93DF
    claim_text: A staged impact diagnostic shall be kibi_impact_evidence_missing, symbols_manifest_stale or kibi_impact_override_missing_rationale
    role: normative
    status: modeled
    span:
      start: 0
      end: 130
  - claim_key: CLAIM-C90E9B30C79A70AE
    claim_text: 'The no impact declaration shall be Kibi-Impact: none'
    role: normative
    status: modeled
    span:
      start: 132
      end: 184
  - claim_key: CLAIM-41E5DF73D62AB2AA
    claim_text: The symbols manifest shall be .kb/symbols.yaml
    role: normative
    status: modeled
    span:
      start: 186
      end: 232
  - claim_key: CLAIM-CA13B6BD6887ECD6
    claim_text: The symbol coordinates file shall be .kb/symbol-coordinates.yaml
    role: normative
    status: modeled
    span:
      start: 234
      end: 298
  - claim_key: CLAIM-7CE10A9A659DEC27
    claim_text: The entity schema guide shall be docs/entity-schema.md
    role: normative
    status: modeled
    span:
      start: 300
      end: 354
logic_claims:
  - CLAIM-5DCC5375F28A93DF
  - CLAIM-C90E9B30C79A70AE
  - CLAIM-41E5DF73D62AB2AA
  - CLAIM-CA13B6BD6887ECD6
  - CLAIM-7CE10A9A659DEC27
id: REQ-staged-impact-identifiers
type: req
---
A staged impact diagnostic shall be kibi_impact_evidence_missing, symbols_manifest_stale or kibi_impact_override_missing_rationale. The no impact declaration shall be Kibi-Impact: none. The symbols manifest shall be .kb/symbols.yaml. The symbol coordinates file shall be .kb/symbol-coordinates.yaml. The entity schema guide shall be docs/entity-schema.md.

## Context

REQ-cli-staged-impact-enforcement blocks a staged change that touches code without Kibi evidence. It reports one of a closed list of diagnostics, reads the symbol manifest and its derived coordinates, points at the entity schema guide, and accepts a commit line that declares no impact. They are stated here so every value is proved against its constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"