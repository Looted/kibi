---
title: Symbol roles and granularity reasons
status: open
priority: must
firmness: firm
semantic_text: A symbol role shall be behavioral, structural, type-shape, config, module or unknown. An allowed granularity reason shall be config-artifact, module-level-behavior, extractor-miss, legacy-link or test-suite. A coarse granularity reason shall be config-artifact, module-level-behavior, extractor-miss or test-suite. The granularity check shall cover implements, covered_by and executable_for links. The symbol granularity violation code shall be SYMBOL_GRANULARITY_VIOLATION.
semantic_clauses:
  - A symbol role shall be behavioral, structural, type-shape, config, module or unknown.
  - An allowed granularity reason shall be config-artifact, module-level-behavior, extractor-miss, legacy-link or test-suite.
  - A coarse granularity reason shall be config-artifact, module-level-behavior, extractor-miss or test-suite.
  - The granularity check shall cover implements, covered_by and executable_for links.
  - The symbol granularity violation code shall be SYMBOL_GRANULARITY_VIOLATION.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T19:09:39.343Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 14844daa2d5e48e01489c271682966284acc32c0fb3a19d30cb298f359ed35c5
semantic_inventory:
  - claim_key: CLAIM-2563BCC53838A6FC
    claim_text: A symbol role shall be behavioral, structural, type-shape, config, module or unknown
    role: normative
    status: modeled
    span:
      start: 0
      end: 84
  - claim_key: CLAIM-A9B5CB4C46F7AAF7
    claim_text: An allowed granularity reason shall be config-artifact, module-level-behavior, extractor-miss, legacy-link or test-suite
    role: normative
    status: modeled
    span:
      start: 86
      end: 206
  - claim_key: CLAIM-C525D425817BE74B
    claim_text: A coarse granularity reason shall be config-artifact, module-level-behavior, extractor-miss or test-suite
    role: normative
    status: modeled
    span:
      start: 208
      end: 313
  - claim_key: CLAIM-E0AFAE13BA353969
    claim_text: The granularity check shall cover implements, covered_by and executable_for links
    role: normative
    status: modeled
    span:
      start: 315
      end: 396
  - claim_key: CLAIM-117ABEF987E239AF
    claim_text: The symbol granularity violation code shall be SYMBOL_GRANULARITY_VIOLATION
    role: normative
    status: modeled
    span:
      start: 398
      end: 473
logic_claims:
  - CLAIM-2563BCC53838A6FC
  - CLAIM-A9B5CB4C46F7AAF7
  - CLAIM-C525D425817BE74B
  - CLAIM-E0AFAE13BA353969
  - CLAIM-117ABEF987E239AF
id: REQ-symbol-granularity-vocabulary
type: req
---
A symbol role shall be behavioral, structural, type-shape, config, module or unknown. An allowed granularity reason shall be config-artifact, module-level-behavior, extractor-miss, legacy-link or test-suite. A coarse granularity reason shall be config-artifact, module-level-behavior, extractor-miss or test-suite. The granularity check shall cover implements, covered_by and executable_for links. The symbol granularity violation code shall be SYMBOL_GRANULARITY_VIOLATION.

## Context

REQ-symbol-behavioral-anchors rejects a coarse traceability link when a narrower behavioral symbol exists. A symbol carries one of a closed list of roles, a coarse link must give one of the allowed reasons, the check covers three link types and reports its own violation code. They are stated here so every value is proved against its constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"