---
title: Documentation site loads cookieless analytics scoped to its published host
status: open
priority: could
tags:
  - docs
  - site
  - analytics
semantic_text: Every documentation site page loads the Umami analytics script. The analytics script reports only on the published Pages host.
logic_claims:
  - CLAIM-B7DCB07410DBD7E3
  - CLAIM-A61E1963BA907523
semantic_clauses:
  - Every documentation site page loads the Umami analytics script.
  - The analytics script reports only on the published Pages host.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 7e03de667d5b192cba7e276a0412a6d3cab28e56d99182f4eaa69decea304f97
semantic_inventory:
  - claim_key: CLAIM-B7DCB07410DBD7E3
    claim_text: Every documentation site page loads the Umami analytics script
    role: descriptive
    status: modeled
    reason: Grounded by the strict property fact for documentation-site analytics.
    span:
      start: 0
      end: 62
  - claim_key: CLAIM-A61E1963BA907523
    claim_text: The analytics script reports only on the published Pages host
    role: descriptive
    status: modeled
    reason: Grounded by the strict property fact for documentation-site analytics.
    span:
      start: 64
      end: 125
origin:
  kind: agent
  recorded_at: '2026-10-06T17:52:36.175Z'
id: REQ-docs-site-analytics
type: req
rationale: Measures how visitors find and adopt Kibi (install copies, install method choice, GitHub clicks) without cookies, while local and test builds stay out of the numbers.
---
Every documentation site page loads the Umami analytics script. The analytics script reports only on the published Pages host.
