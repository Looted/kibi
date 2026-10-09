---
title: kibi-plugin-ui ships a design check policy for React and Angular components
status: open
priority: must
tags:
  - plugins
  - ui
  - kibi-plugin-ui
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-09: UI design plugin'
  recorded_at: '2026-10-09T12:13:47.366Z'
rationale: UI design enforcement is experimental and only useful for projects with a frontend, so it ships as an optional package rather than as default behavior.
semantic_text: The kibi-plugin-ui policy must require React and Angular components to implement a requirement grounded in UI design predicates. The kibi-plugin-ui policy must require implementing component files and their html templates to contain every pattern marker of their requirement pattern. The kibi-plugin-ui package must declare no permissions.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 2e63ad52aa06acf9d2b3c03411e5c734c4987435c9a321cfd3c061296b36b0ea
semantic_inventory:
  - claim_key: CLAIM-9748D6FBAF594600
    claim_text: The kibi-plugin-ui policy must require React and Angular components to implement a requirement grounded in UI design predicates
    role: normative
    status: modeled
    span:
      start: 0
      end: 127
  - claim_key: CLAIM-46DC37CA36AB76CF
    claim_text: The kibi-plugin-ui policy must require implementing component files and their html templates to contain every pattern marker of their requirement pattern
    role: normative
    status: modeled
    span:
      start: 129
      end: 282
  - claim_key: CLAIM-3E9D243F8B18A315
    claim_text: The kibi-plugin-ui package must declare no permissions
    role: normative
    status: modeled
    span:
      start: 284
      end: 338
semantic_clauses:
  - The kibi-plugin-ui policy must require React and Angular components to implement a requirement grounded in UI design predicates.
  - The kibi-plugin-ui policy must require implementing component files and their html templates to contain every pattern marker of their requirement pattern.
  - The kibi-plugin-ui package must declare no permissions.
logic_claims:
  - CLAIM-9748D6FBAF594600
  - CLAIM-46DC37CA36AB76CF
  - CLAIM-3E9D243F8B18A315
id: REQ-ui-plugin-design-policy
type: req
---
The kibi-plugin-ui policy must require React and Angular components to implement a requirement grounded in UI design predicates. The kibi-plugin-ui policy must require implementing component files and their html templates to contain every pattern marker of their requirement pattern. The kibi-plugin-ui package must declare no permissions.

## Context

The project owner wanted the UI design checks to be experimental and not tied tightly to core, since some projects have no frontend, while keeping Kibi mostly configuration-less. The agreed design is an optional kibi-plugin-ui package holding only a check policy: ownership rules for tsx, jsx and Angular component files with tests and stories excluded and a review:ui-unconstrained exemption, and a marker rule that searches the component file and its html template. Colours and component-library choices stay with linters.

## Source

> The feature would be somehow experimental, so I don't want to tie it too strongly to the core - that's why I had the plugin idea.

Project owner, project thread on the UI design plugin, 2026-10-09.
