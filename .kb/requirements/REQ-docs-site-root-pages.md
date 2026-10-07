---
title: Documentation site is the project Pages root, with the requirement report beside it
status: open
tags:
  - docs
  - pages
  - site
  - ci
  - review:context-missing
priority: should
semantic_text: The repository publishes the documentation site, including its landing page, at the root of project Pages on every push to the default branch. The requirement-health report is published under /kibi-report/ beside the documentation site. The documentation site is rendered from the repository's docs/ sources at build time instead of a forked copy. The documentation build fails when an internal documentation link is broken.
logic_claims:
  - CLAIM-D7EC1967FE8D582A
  - CLAIM-3C1E636A1BAD5DC5
  - CLAIM-01C1926546AE9F52
  - CLAIM-F440124327660157
semantic_clauses:
  - The repository publishes the documentation site, including its landing page, at the root of project Pages on every push to the default branch.
  - The requirement-health report is published under /kibi-report/ beside the documentation site.
  - The documentation site is rendered from the repository's docs/ sources at build time instead of a forked copy.
  - The documentation build fails when an internal documentation link is broken.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ff9c2f5a8b650170f5ba1aedbe67503d47e424eee564db79be599ffe88b2852e
semantic_inventory:
  - claim_key: CLAIM-D7EC1967FE8D582A
    claim_text: The repository publishes the documentation site, including its landing page, at the root of project Pages on every push to the default branch
    payload_hash: 68d821a98dae703c64ce6f654fd1d87b2a1cba8c2c21186ab8d49ccbf1796520
    reason: Grounded by the strict property fact for the root publish path.
    role: descriptive
    span:
      start: 0
      end: 141
    status: modeled
  - claim_key: CLAIM-3C1E636A1BAD5DC5
    claim_text: The requirement-health report is published under /kibi-report/ beside the documentation site
    payload_hash: 68d821a98dae703c64ce6f654fd1d87b2a1cba8c2c21186ab8d49ccbf1796520
    reason: Grounded by the strict property fact for the report path.
    role: descriptive
    span:
      start: 143
      end: 235
    status: modeled
  - claim_key: CLAIM-01C1926546AE9F52
    claim_text: The documentation site is rendered from the repository's docs/ sources at build time instead of a forked copy
    payload_hash: 68d821a98dae703c64ce6f654fd1d87b2a1cba8c2c21186ab8d49ccbf1796520
    reason: Grounded by the strict property fact for the build-time source mode.
    role: descriptive
    span:
      start: 237
      end: 346
    status: modeled
  - claim_key: CLAIM-F440124327660157
    claim_text: The documentation build fails when an internal documentation link is broken
    payload_hash: 68d821a98dae703c64ce6f654fd1d87b2a1cba8c2c21186ab8d49ccbf1796520
    reason: Grounded by the strict property fact for the broken-link build policy.
    role: normative
    span:
      start: 348
      end: 423
    status: modeled
id: REQ-docs-site-root-pages
type: req
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
The repository publishes the documentation site, including its landing page, at the root of project Pages on every push to the default branch. The requirement-health report is published under /kibi-report/ beside the documentation site. The documentation site is rendered from the repository's docs/ sources at build time instead of a forked copy. The documentation build fails when an internal documentation link is broken.
