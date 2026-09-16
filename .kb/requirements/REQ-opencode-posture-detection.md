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
links:
  - type: specified_by
    target: SCEN-opencode-posture-detection
  - type: verified_by
    target: TEST-opencode-smart-enforcement
semantic_text: 'The OpenCode plugin must detect the current workspace posture to adjust enforcement:\n\n`root_active`: Kibi is initialized at the repo root with a valid `.kb/config.json`.\n`root_partial`: Root `.kb/config.json` exists but KB targets are incomplete.\n`root_uninitialized`: No root `.kb/config.json`, but root declares Kibi intent.\n`vendored_only`: Kibi is only present in vendored dependencies.\n`hybrid_root_plus_vendored`: Root `.kb/config.json` exists alongside vendored trees; root is authoritative.\nSupport a `maintenanceDegraded` overlay when runtime execution is unavailable.'
logic_claims:
  - CLAIM-9C0D0DBABFF8256E
semantic_clauses:
  - 'The OpenCode plugin must detect the current workspace posture to adjust enforcement:\n\n`root_active`: Kibi is initialized at the repo root with a valid `.kb/config.json`.\n`root_partial`: Root `.kb/config.json` exists but KB targets are incomplete.\n`root_uninitialized`: No root `.kb/config.json`, but root declares Kibi intent.\n`vendored_only`: Kibi is only present in vendored dependencies.\n`hybrid_root_plus_vendored`: Root `.kb/config.json` exists alongside vendored trees; root is authoritative.\nSupport a `maintenanceDegraded` overlay when runtime execution is unavailable'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 5a00f3e32551cee7df39d0c98c8bbd0d84f1a890444605d1cb1d8a72765acf6f
semantic_inventory:
  - claim_key: CLAIM-9C0D0DBABFF8256E
    claim_text: 'The OpenCode plugin must detect the current workspace posture to adjust enforcement:\n\n`root_active`: Kibi is initialized at the repo root with a valid `.kb/config.json`.\n`root_partial`: Root `.kb/config.json` exists but KB targets are incomplete.\n`root_uninitialized`: No root `.kb/config.json`, but root declares Kibi intent.\n`vendored_only`: Kibi is only present in vendored dependencies.\n`hybrid_root_plus_vendored`: Root `.kb/config.json` exists alongside vendored trees; root is authoritative.\nSupport a `maintenanceDegraded` overlay when runtime execution is unavailable'
    role: normative
    status: modeled
    span:
      start: 0
      end: 583
type: req
---

The OpenCode plugin must detect the current workspace posture to adjust enforcement:

1. `root_active`: Kibi is initialized at the repo root with a valid `.kb/config.json`.
2. `root_partial`: Root `.kb/config.json` exists but KB targets are incomplete.
3. `root_uninitialized`: No root `.kb/config.json`, but root declares Kibi intent.
4. `vendored_only`: Kibi is only present in vendored dependencies.
5. `hybrid_root_plus_vendored`: Root `.kb/config.json` exists alongside vendored trees; root is authoritative.
6. Support a `maintenanceDegraded` overlay when runtime execution is unavailable.
