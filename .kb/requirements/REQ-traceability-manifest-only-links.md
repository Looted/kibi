---
title: The staged traceability gate takes requirement links only from the symbol manifest
status: open
priority: must
firmness: firm
approval_ref: Maintainer approved this wording as a firm rule on 2026-11-11
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer decision, 2026-11-11, to hard-drop inline implements comments; wording approved: "Ok"'
  recorded_at: '2026-11-11T05:45:01.592Z'
tags:
  - traceability
  - symbols
  - implements-comments
semantic_text: The staged traceability gate takes a changed symbol's requirement links only from the symbol manifest; an `implements` comment in source code never satisfies or changes them.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: bab80a5c36d31dbf16462ff278cc4b6e579cf8b50051d019e676d73b8dc19232
semantic_inventory:
  - claim_key: CLAIM-84AC70D32820F0EC
    claim_text: The staged traceability gate takes a changed symbol's requirement links only from the symbol manifest
    role: descriptive
    status: modeled
    span:
      start: 0
      end: 101
  - claim_key: CLAIM-39FC9C19886820FB
    claim_text: an `implements` comment in source code never satisfies or changes them
    role: descriptive
    status: modeled
    span:
      start: 103
      end: 173
logic_claims:
  - CLAIM-84AC70D32820F0EC
  - CLAIM-39FC9C19886820FB
id: REQ-traceability-manifest-only-links
type: req
---
The staged traceability gate takes a changed symbol's requirement links only from the symbol manifest; an `implements` comment in source code never satisfies or changes them.

## Why

Inline comments drifted from the manifest: in Kibi's own repository only 605 of 4,366 commented symbols matched their manifest links, and 1,741 comment links named closed requirements. The staged gate still counted those comments, and a leading comment even replaced the symbol's manifest links, so a stale comment could pass the gate. The maintainer chose to drop comments as a source so that the manifest is the only record.

## Source

> We already decided at some point comments should be fallbacks, and the symbols cooridnates should take their role. I still see the comments in the code - should we just hard drop/migrate them?

Maintainer, 2026-11-11.
