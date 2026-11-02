---
title: Source proof reader vocabulary
status: open
priority: should
firmness: firm
semantic_text: Source proof readers must be one of json, yaml, glob, openapi, references, schema, routes, validator or prolog.
semantic_clauses:
  - Source proof readers must be one of json, yaml, glob, openapi, references, schema, routes, validator or prolog.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-31, to add the SWI-Prolog source readers of the multilingual proof plan (phase 2): "Start the next phase." Earlier, 2026-10-27: "Please work towards full proof."'
  approved_by: maintainer
  recorded_at: '2026-10-31T10:21:36.645Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 6dcc0fca6b833f9320e955fe04a8a4b8a19c304fdae7a02dcbcc2e0dea28bc2e
semantic_inventory:
  - claim_key: CLAIM-D1436E2B6F2C67DE
    claim_text: Source proof readers must be one of json, yaml, glob, openapi, references, schema, routes, validator or prolog
    role: normative
    status: modeled
    span:
      start: 0
      end: 110
logic_claims:
  - CLAIM-D1436E2B6F2C67DE
id: REQ-kibi-source-proof-reader-vocabulary
type: req
---
Source proof readers must be one of json, yaml, glob, openapi, references, schema, routes, validator or prolog.

## Context

REQ-kibi-source-proof-kinds lets a source proof read project files through a closed set of readers. The entity schema lists those readers, and a source certificate reads the list back from the schema itself. The prolog reader joined the set with the SWI-Prolog source readers.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?" Approving the SWI-Prolog source readers, 2026-10-31: "Start the next phase."