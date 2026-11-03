---
id: REQ-opencode-smart-enforcement-v1
title: 'OpenCode Smart Enforcement: Umbrella'
status: open
created_at: 2026-04-03T00:00:00.000Z
updated_at: 2026-05-13T00:00:00.000Z
source: packages/opencode/
priority: must
owner: opencode-team
tags:
  - opencode
  - kibi
  - enforcement
  - review:context-missing
links:
  - type: specified_by
    target: SCEN-opencode-smart-enforcement-v1-coverage
  - REQ-opencode-posture-detection
  - REQ-opencode-risk-classification
  - REQ-opencode-guidance-caching
semantic_text: The OpenCode Kibi plugin must adjust its enforcement to the workspace posture and the risk of the edit. The OpenCode Kibi plugin's guidance must stay non-blocking and within its token budget.
logic_claims:
  - CLAIM-62AC22FF0A8A2B17
  - CLAIM-CBC32FC4EFA3154F
semantic_clauses:
  - The OpenCode Kibi plugin must adjust its enforcement to the workspace posture and the risk of the edit.
  - The OpenCode Kibi plugin's guidance must stay non-blocking and within its token budget.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 4e104bfc6de8c9bf656dd8cfa921ab2c74318743134399420a6d18e8b19e1dd5
semantic_inventory:
  - claim_key: CLAIM-62AC22FF0A8A2B17
    claim_text: The OpenCode Kibi plugin must adjust its enforcement to the workspace posture and the risk of the edit
    role: normative
    status: modeled
    span:
      start: 0
      end: 102
  - claim_key: CLAIM-CBC32FC4EFA3154F
    claim_text: The OpenCode Kibi plugin's guidance must stay non-blocking and within its token budget
    role: normative
    status: modeled
    span:
      start: 104
      end: 190
type: req
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Atomic clause rewrite of the migrated requirement body (Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Atomic clause rewrite of the migrated requirement body (kibi migrate v5->v6).).'
  approved_by: maintainer
  recorded_at: '2026-11-03T12:03:44.000Z'
firmness: default
required_evidence: tested
---
- The OpenCode Kibi plugin must adjust its enforcement to the workspace posture and the risk of the edit.
- The OpenCode Kibi plugin's guidance must stay non-blocking and within its token budget.

This requirement is the umbrella for REQ-opencode-posture-detection, REQ-opencode-risk-classification and REQ-opencode-guidance-caching.
