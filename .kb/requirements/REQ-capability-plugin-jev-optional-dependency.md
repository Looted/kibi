---
title: kibi-cli, kibi-mcp and kibi-runtime do not depend on Jev
status: open
priority: must
firmness: firm
semantic_text: The kibi-cli package dependencies shall exclude kibi-plugin-jev. The kibi-mcp package dependencies shall exclude kibi-plugin-jev. The kibi-runtime package dependencies shall exclude kibi-plugin-jev.
semantic_clauses:
  - The kibi-cli package dependencies shall exclude kibi-plugin-jev.
  - The kibi-mcp package dependencies shall exclude kibi-plugin-jev.
  - The kibi-runtime package dependencies shall exclude kibi-plugin-jev.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T10:17:36.316Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a98bfab2441f9cb556e6098efb26132330561e65f04148b5f1ea457ef5ed586b
semantic_inventory:
  - claim_key: CLAIM-5D1C017C0416B115
    claim_text: The kibi-cli package dependencies shall exclude kibi-plugin-jev
    role: normative
    status: modeled
    span:
      start: 0
      end: 63
  - claim_key: CLAIM-EF4F96A11A712F75
    claim_text: The kibi-mcp package dependencies shall exclude kibi-plugin-jev
    role: normative
    status: modeled
    span:
      start: 65
      end: 128
  - claim_key: CLAIM-3A89EF7214DE03AB
    claim_text: The kibi-runtime package dependencies shall exclude kibi-plugin-jev
    role: normative
    status: modeled
    span:
      start: 130
      end: 197
logic_claims:
  - CLAIM-5D1C017C0416B115
  - CLAIM-EF4F96A11A712F75
  - CLAIM-3A89EF7214DE03AB
id: REQ-capability-plugin-jev-optional-dependency
type: req
---
The kibi-cli package dependencies shall exclude kibi-plugin-jev. The kibi-mcp package dependencies shall exclude kibi-plugin-jev. The kibi-runtime package dependencies shall exclude kibi-plugin-jev.

## Context

REQ-capability-plugin-observable-behavior-v1 says optional Jev must be absent from the default CLI, MCP and runtime dependency graphs. The first step of that graph is each package's own dependencies in its package.json; this requirement states that step for kibi-cli, kibi-mcp and kibi-runtime so it is proved against the manifests. Transitive absence stays tested there.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"