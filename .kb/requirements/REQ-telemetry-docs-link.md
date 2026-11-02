---
title: Telemetry documentation link
status: open
priority: must
firmness: firm
tags:
  - proof
semantic_text: The Kibi telemetry documentation page shall be https://looted.github.io/kibi/guide/telemetry.html.
semantic_clauses:
  - The Kibi telemetry documentation page shall be https://looted.github.io/kibi/guide/telemetry.html.
origin:
  kind: agent
  ref: 'Maintainer request, 2026-10-30, to keep proving structural requirements: "Can you continue prooving additional requirements?"'
  approved_by: maintainer
  recorded_at: '2026-10-30T19:44:56.564Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 7d5ea38635d4c55e524772b4c20124c911cd4ba760296e382ed47e1983a2e84e
semantic_inventory:
  - claim_key: CLAIM-8547DA9ED05ED915
    claim_text: The Kibi telemetry documentation page shall be https://looted.github.io/kibi/guide/telemetry.html
    role: normative
    status: modeled
    span:
      start: 0
      end: 97
logic_claims:
  - CLAIM-8547DA9ED05ED915
id: REQ-telemetry-docs-link
type: req
---
The Kibi telemetry documentation page shall be https://looted.github.io/kibi/guide/telemetry.html.

## Context

REQ-kibi-anonymous-usage-telemetry has the first run that records telemetry print a notice naming how to turn it off, and kibi telemetry status links the same page. The page is stated here so it is proved against TELEMETRY_DOCS_URL in packages/agent-core/src/usage-telemetry.ts.

## Source

Maintainer request, 2026-10-30, to keep proving structural requirements: "Can you continue prooving additional requirements?"
