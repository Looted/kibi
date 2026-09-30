---
title: Documentation site is the project Pages root, with the requirement report beside it
status: open
tags:
  - docs
  - pages
  - site
  - ci
priority: should
semantic_text: The repository publishes the documentation site, including its landing page, at the root of project Pages on every push to the default branch. The requirement-health report is published under /kibi-report/ beside the documentation site. Every documentation page previously published under /docs/ redirects to the same page at the site root. The documentation site is rendered from the repository's docs/ sources at build time instead of a forked copy. The documentation build fails when an internal documentation link is broken.
logic_claims:
  - CLAIM-D7EC1967FE8D582A
  - CLAIM-3C1E636A1BAD5DC5
  - CLAIM-BCF16C11CAF5FB5A
  - CLAIM-01C1926546AE9F52
  - CLAIM-F440124327660157
semantic_clauses:
  - The repository publishes the documentation site, including its landing page, at the root of project Pages on every push to the default branch.
  - The requirement-health report is published under /kibi-report/ beside the documentation site.
  - Every documentation page previously published under /docs/ redirects to the same page at the site root.
  - The documentation site is rendered from the repository's docs/ sources at build time instead of a forked copy.
  - The documentation build fails when an internal documentation link is broken.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 1f6115e72b7456fca971373b4746debb9fc9f9c8f740ac6a38a1275b00861e14
semantic_inventory:
  - claim_key: CLAIM-D7EC1967FE8D582A
    claim_text: The repository publishes the documentation site, including its landing page, at the root of project Pages on every push to the default branch
    payload_hash: 567d465d2b29de2514b6859810d55e8367ea62fc508ef72b968824c191d3b52a
    reason: Grounded by the strict property fact for the root publish path.
    role: descriptive
    span:
      start: 0
      end: 141
    status: modeled
  - claim_key: CLAIM-3C1E636A1BAD5DC5
    claim_text: The requirement-health report is published under /kibi-report/ beside the documentation site
    payload_hash: 567d465d2b29de2514b6859810d55e8367ea62fc508ef72b968824c191d3b52a
    reason: Grounded by the strict property fact for the report path.
    role: descriptive
    span:
      start: 143
      end: 235
    status: modeled
  - claim_key: CLAIM-BCF16C11CAF5FB5A
    claim_text: Every documentation page previously published under /docs/ redirects to the same page at the site root
    payload_hash: 567d465d2b29de2514b6859810d55e8367ea62fc508ef72b968824c191d3b52a
    reason: Grounded by the strict property fact for legacy /docs/ redirects.
    role: descriptive
    span:
      start: 237
      end: 339
    status: modeled
  - claim_key: CLAIM-01C1926546AE9F52
    claim_text: The documentation site is rendered from the repository's docs/ sources at build time instead of a forked copy
    payload_hash: 567d465d2b29de2514b6859810d55e8367ea62fc508ef72b968824c191d3b52a
    reason: Grounded by the strict property fact for the build-time source mode.
    role: descriptive
    span:
      start: 341
      end: 450
    status: modeled
  - claim_key: CLAIM-F440124327660157
    claim_text: The documentation build fails when an internal documentation link is broken
    payload_hash: 567d465d2b29de2514b6859810d55e8367ea62fc508ef72b968824c191d3b52a
    reason: Grounded by the strict property fact for the broken-link build policy.
    role: normative
    span:
      start: 452
      end: 527
    status: modeled
id: REQ-docs-site-root-pages
type: req
---
The repository publishes the documentation site, including its landing page, at the root of project Pages on every push to the default branch. The requirement-health report is published under /kibi-report/ beside the documentation site. Every documentation page previously published under /docs/ redirects to the same page at the site root. The documentation site is rendered from the repository's docs/ sources at build time instead of a forked copy. The documentation build fails when an internal documentation link is broken.
