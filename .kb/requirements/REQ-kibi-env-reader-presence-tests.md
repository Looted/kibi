---
title: The env references reader reads nothing from presence tests of the global object and refuses handing it on
status: open
priority: must
required_evidence: tested
tags:
  - proof
  - source
semantic_text: The env references reader must read nothing from code that only tests the global object or an alias of it for presence, and must refuse a file that hands the global object on to other code.
semantic_clauses:
  - The env references reader must read nothing from code that only tests the global object or an alias of it for presence, and must refuse a file that hands the global object on to other code.
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer-approved statement (2026-11-16): "The env references reader must read nothing from code that only tests the global object or an alias of it for presence, and must refuse a file that hands the global object on to other code."'
  recorded_at: '2026-11-16T11:06:27.135Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 3a5c6973d2d41e432ff53b5fd639e8c108058a213d012608dedc5d2d0411a86e
semantic_inventory:
  - claim_key: CLAIM-B63D707DF7C6C27F
    claim_text: The env references reader must read nothing from code that only tests the global object or an alias of it for presence, and must refuse a file that hands the global object on to other code
    role: normative
    status: modeled
    span:
      start: 0
      end: 188
logic_claims:
  - CLAIM-B63D707DF7C6C27F
id: REQ-kibi-env-reader-presence-tests
type: req
---
The env references reader must read nothing from code that only tests the global object or an alias of it for presence, and must refuse a file that hands the global object on to other code.

## Context

The env references reader behind source proofs refused any file that touched the global object, so a browser file that only checks whether a global exists before using it could not be proved. PR 740 narrowed that: a presence test reads nothing, while handing the global object on stays refused because the receiver can read process.env through it. The change shipped without a requirement; this records it. Requested by the project owner after an audit of the PRs merged since the last release.

## Source

Maintainer-approved statement (2026-11-16): "The env references reader must read nothing from code that only tests the global object or an alias of it for presence, and must refuse a file that hands the global object on to other code."