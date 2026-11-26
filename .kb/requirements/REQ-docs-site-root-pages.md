---
title: Documentation site is the project Pages root, deployed from master, with the requirement report beside it
status: open
tags:
  - docs
  - pages
  - site
  - ci
priority: should
semantic_text: The repository publishes the documentation site, including its landing page, at the root of project Pages on every push to master, the release branch, and never from develop. The requirement-health report is published under /kibi-report/ beside the documentation site. The documentation site is rendered from the repository's docs/ sources at build time instead of a forked copy. The documentation build fails when an internal documentation link is broken.
logic_claims:
  - CLAIM-612F050DEDB5442F
  - CLAIM-3C1E636A1BAD5DC5
  - CLAIM-01C1926546AE9F52
  - CLAIM-F440124327660157
semantic_clauses:
  - The repository publishes the documentation site, including its landing page, at the root of project Pages on every push to master, the release branch, and never from develop.
  - The requirement-health report is published under /kibi-report/ beside the documentation site.
  - The documentation site is rendered from the repository's docs/ sources at build time instead of a forked copy.
  - The documentation build fails when an internal documentation link is broken.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: bbb72da0341ce2d0d55f3550a2328be8eb13b67264e7eb399fd382270840d469
semantic_inventory:
  - claim_key: CLAIM-612F050DEDB5442F
    claim_text: The repository publishes the documentation site, including its landing page, at the root of project Pages on every push to master, the release branch, and never from develop
    payload_hash: c8a28f17cdf8cf0400ce7cfeb35b67c20f69f6a132d730919e54cb7a9b5d7ac5
    reason: Grounded by the strict property fact for the root publish path.
    role: descriptive
    span:
      start: 0
      end: 173
    status: modeled
  - claim_key: CLAIM-3C1E636A1BAD5DC5
    claim_text: The requirement-health report is published under /kibi-report/ beside the documentation site
    payload_hash: c8a28f17cdf8cf0400ce7cfeb35b67c20f69f6a132d730919e54cb7a9b5d7ac5
    reason: Grounded by the strict property fact for the report path.
    role: descriptive
    span:
      start: 175
      end: 267
    status: modeled
  - claim_key: CLAIM-01C1926546AE9F52
    claim_text: The documentation site is rendered from the repository's docs/ sources at build time instead of a forked copy
    payload_hash: c8a28f17cdf8cf0400ce7cfeb35b67c20f69f6a132d730919e54cb7a9b5d7ac5
    reason: Grounded by the strict property fact for the build-time source mode.
    role: descriptive
    span:
      start: 269
      end: 378
    status: modeled
  - claim_key: CLAIM-F440124327660157
    claim_text: The documentation build fails when an internal documentation link is broken
    payload_hash: c8a28f17cdf8cf0400ce7cfeb35b67c20f69f6a132d730919e54cb7a9b5d7ac5
    reason: Grounded by the strict property fact for the broken-link build policy.
    role: normative
    span:
      start: 380
      end: 455
    status: modeled
id: REQ-docs-site-root-pages
type: req
origin:
  kind: human
  ref: 'Maintainer decision, 2026-11-26: "Should also publish pages from master, not develop, so it''s up to date with what''s actually released."'
  approved_by: maintainer
  recorded_at: '2026-11-26T11:20:57.501Z'
firmness: firm
rationale: 'The maintainer asked for the site to deploy from master instead of develop, so that it matches what is released: it had deployed on every develop push and described unreleased work.'
---
The repository publishes the documentation site, including its landing page, at the root of project Pages on every push to master, the release branch, and never from develop. The requirement-health report is published under /kibi-report/ beside the documentation site. The documentation site is rendered from the repository's docs/ sources at build time instead of a forked copy. The documentation build fails when an internal documentation link is broken.

## Why this changed

The maintainer asked for the site to deploy from master instead of develop, so that it matches what is released: it had deployed on every develop push and described unreleased work. A push to master now deploys it, and the report beside it is the one develop's proof run wrote for the tree master holds.

Earlier, the docs site moved from /docs/ to the Pages root, the report moved under /kibi-report/, and old /docs/ links redirect. Source: PR 298.

## Source

> Maintainer decision, 2026-11-26: "Should also publish pages from master, not develop, so it's up to date with what's actually released."
