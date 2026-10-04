---
title: Documentation site published beside the requirement report
status: open
tags:
  - docs
  - pages
  - site
  - ci
priority: should
id: REQ-docs-site-pages
type: req
semantic_text: The repository publishes the browsable documentation site at /docs/ on project Pages alongside the requirement-health report under /kibi-report/ on every push to the default branch. The documentation site is rendered from the repository's docs/ sources at build time instead of a forked copy. The documentation build fails when an internal documentation link is broken.
logic_claims:
  - CLAIM-FE70D6D3DFA37E5E
  - CLAIM-01C1926546AE9F52
  - CLAIM-F440124327660157
semantic_clauses:
  - The repository publishes the browsable documentation site at /docs/ on project Pages alongside the requirement-health report under /kibi-report/ on every push to the default branch.
  - The documentation site is rendered from the repository's docs/ sources at build time instead of a forked copy.
  - The documentation build fails when an internal documentation link is broken.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 9f87c9df18f5204f7b25938559a0e165fcce5552851b19e0f641451240f0be5b
semantic_inventory:
  - claim_key: CLAIM-FE70D6D3DFA37E5E
    claim_text: The repository publishes the browsable documentation site at /docs/ on project Pages alongside the requirement-health report under /kibi-report/ on every push to the default branch
    payload_hash: f8f355fe059b1c05318ea91bbf9189577d9bbb11e2ee52f5d046f82677175cbe
    reason: Grounded by the strict property fact for the published site path.
    role: descriptive
    span:
      end: 180
      start: 0
    status: modeled
  - claim_key: CLAIM-01C1926546AE9F52
    claim_text: The documentation site is rendered from the repository's docs/ sources at build time instead of a forked copy
    payload_hash: f8f355fe059b1c05318ea91bbf9189577d9bbb11e2ee52f5d046f82677175cbe
    reason: Grounded by the strict property fact for the build-time source mode.
    role: descriptive
    span:
      end: 291
      start: 182
    status: modeled
  - claim_key: CLAIM-F440124327660157
    claim_text: The documentation build fails when an internal documentation link is broken
    payload_hash: f8f355fe059b1c05318ea91bbf9189577d9bbb11e2ee52f5d046f82677175cbe
    reason: Grounded by the strict property fact for the broken-link build policy.
    role: normative
    span:
      end: 368
      start: 293
    status: modeled
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
# Requirement: Documentation site published beside the requirement report

The repository publishes the browsable documentation site at /docs/ on project Pages alongside the requirement-health report under /kibi-report/ on every push to the default branch. The documentation site is rendered from the repository's docs/ sources at build time instead of a forked copy. The documentation build fails when an internal documentation link is broken.