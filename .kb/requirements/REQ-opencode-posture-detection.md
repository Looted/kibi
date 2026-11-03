---
id: REQ-opencode-posture-detection
title: OpenCode Posture Detection
status: open
created_at: 2026-05-13T00:00:00.000Z
source: packages/opencode/src/repo-posture.ts
priority: must
owner: opencode-team
tags:
  - opencode
  - kibi
  - posture
  - review:context-missing
links:
  - type: specified_by
    target: SCEN-opencode-posture-detection
  - type: verified_by
    target: TEST-opencode-smart-enforcement
semantic_text: The OpenCode plugin must classify the workspace as root_active when .kb/manifest.json exists at the repository root and the canonical KB targets resolve. The OpenCode plugin must classify the workspace as root_partial when the root .kb/manifest.json exists but some canonical KB targets are missing. The OpenCode plugin must classify the workspace as root_uninitialized when there is no root .kb/manifest.json but the root declares Kibi intent. The OpenCode plugin must classify the workspace as vendored_only when Kibi is present only in vendored dependencies. The OpenCode plugin must classify the workspace as hybrid_root_plus_vendored, with the root authoritative, when the root .kb/manifest.json exists alongside vendored Kibi trees. The OpenCode plugin must add a maintenanceDegraded overlay when runtime execution is unavailable.
logic_claims:
  - CLAIM-E01E7F6127902206
  - CLAIM-6F87BA1F99FB1899
  - CLAIM-A84138C288B72584
  - CLAIM-CCAADD688C493D49
  - CLAIM-D6B97A5A2185E49E
  - CLAIM-7B14D62631489D2D
semantic_clauses:
  - The OpenCode plugin must classify the workspace as root_active when .kb/manifest.json exists at the repository root and the canonical KB targets resolve.
  - The OpenCode plugin must classify the workspace as root_partial when the root .kb/manifest.json exists but some canonical KB targets are missing.
  - The OpenCode plugin must classify the workspace as root_uninitialized when there is no root .kb/manifest.json but the root declares Kibi intent.
  - The OpenCode plugin must classify the workspace as vendored_only when Kibi is present only in vendored dependencies.
  - The OpenCode plugin must classify the workspace as hybrid_root_plus_vendored, with the root authoritative, when the root .kb/manifest.json exists alongside vendored Kibi trees.
  - The OpenCode plugin must add a maintenanceDegraded overlay when runtime execution is unavailable.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0e30b0196ebb1e0e00aae6ee36884db917eef78532c5de5cbb3d21ce3e5e7ae6
semantic_inventory:
  - claim_key: CLAIM-E01E7F6127902206
    claim_text: The OpenCode plugin must classify the workspace as root_active when .kb/manifest.json exists at the repository root and the canonical KB targets resolve
    role: normative
    status: modeled
    span:
      start: 0
      end: 152
  - claim_key: CLAIM-6F87BA1F99FB1899
    claim_text: The OpenCode plugin must classify the workspace as root_partial when the root .kb/manifest.json exists but some canonical KB targets are missing
    role: normative
    status: modeled
    span:
      start: 154
      end: 298
  - claim_key: CLAIM-A84138C288B72584
    claim_text: The OpenCode plugin must classify the workspace as root_uninitialized when there is no root .kb/manifest.json but the root declares Kibi intent
    role: normative
    status: modeled
    span:
      start: 300
      end: 443
  - claim_key: CLAIM-CCAADD688C493D49
    claim_text: The OpenCode plugin must classify the workspace as vendored_only when Kibi is present only in vendored dependencies
    role: normative
    status: modeled
    span:
      start: 445
      end: 560
  - claim_key: CLAIM-D6B97A5A2185E49E
    claim_text: The OpenCode plugin must classify the workspace as hybrid_root_plus_vendored, with the root authoritative, when the root .kb/manifest.json exists alongside vendored Kibi trees
    role: normative
    status: modeled
    span:
      start: 562
      end: 737
  - claim_key: CLAIM-7B14D62631489D2D
    claim_text: The OpenCode plugin must add a maintenanceDegraded overlay when runtime execution is unavailable
    role: normative
    status: modeled
    span:
      start: 739
      end: 835
type: req
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Atomic clause rewrite of the migrated requirement body (Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Atomic clause rewrite of the migrated requirement body (kibi migrate v5->v6).).'
  approved_by: maintainer
  recorded_at: '2026-11-03T12:03:44.000Z'
firmness: default
required_evidence: tested
---
- The OpenCode plugin must classify the workspace as root_active when .kb/manifest.json exists at the repository root and the canonical KB targets resolve.
- The OpenCode plugin must classify the workspace as root_partial when the root .kb/manifest.json exists but some canonical KB targets are missing.
- The OpenCode plugin must classify the workspace as root_uninitialized when there is no root .kb/manifest.json but the root declares Kibi intent.
- The OpenCode plugin must classify the workspace as vendored_only when Kibi is present only in vendored dependencies.
- The OpenCode plugin must classify the workspace as hybrid_root_plus_vendored, with the root authoritative, when the root .kb/manifest.json exists alongside vendored Kibi trees.
- The OpenCode plugin must add a maintenanceDegraded overlay when runtime execution is unavailable.
