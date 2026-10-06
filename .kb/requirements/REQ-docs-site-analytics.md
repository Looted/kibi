---
title: Documentation site loads opt-in cookieless analytics scoped to its published host
status: open
priority: could
tags:
  - docs
  - site
  - analytics
semantic_text: Every published documentation site page loads the Umami analytics script. The analytics script reports only on the published Pages host. Documentation site builds load no analytics unless they are given an Umami website ID.
logic_claims:
  - CLAIM-4566EC9C2803C5A3
  - CLAIM-A61E1963BA907523
  - CLAIM-6905E62A05A681B0
semantic_clauses:
  - Every published documentation site page loads the Umami analytics script.
  - The analytics script reports only on the published Pages host.
  - Documentation site builds load no analytics unless they are given an Umami website ID.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 20198ce504791c319ba77b6c9e88c1c808988b84b5d92d9fb2194afb40c36234
semantic_inventory:
  - claim_key: CLAIM-4566EC9C2803C5A3
    claim_text: Every published documentation site page loads the Umami analytics script
    role: descriptive
    status: modeled
    reason: Grounded by the strict property fact for documentation-site analytics.
    span:
      start: 0
      end: 72
  - claim_key: CLAIM-A61E1963BA907523
    claim_text: The analytics script reports only on the published Pages host
    role: descriptive
    status: modeled
    reason: Grounded by the strict property fact for documentation-site analytics.
    span:
      start: 74
      end: 135
  - claim_key: CLAIM-6905E62A05A681B0
    claim_text: Documentation site builds load no analytics unless they are given an Umami website ID
    role: exception
    status: modeled
    reason: Grounded by the strict property fact for documentation-site analytics.
    span:
      start: 137
      end: 222
origin:
  kind: agent
  recorded_at: '2026-10-06T17:52:36.175Z'
id: REQ-docs-site-analytics
type: req
rationale: Measures how visitors find and adopt Kibi (install copies, install method choice, GitHub clicks) without cookies, while local and test builds stay out of the numbers.
---
Every published documentation site page loads the Umami analytics script. The analytics script reports only on the published Pages host. Documentation site builds load no analytics unless they are given an Umami website ID.