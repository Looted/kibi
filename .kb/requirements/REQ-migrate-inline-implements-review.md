---
title: kibi migrate lists inline implements comments as one review action
status: open
priority: must
firmness: firm
approval_ref: Maintainer approved this wording as a firm rule on 2026-11-11
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer decision, 2026-11-11, to hard-drop inline implements comments; wording approved: "Ok"'
  recorded_at: '2026-11-11T05:45:02.562Z'
tags:
  - traceability
  - symbols
  - implements-comments
semantic_text: '`kibi migrate` lists every `implements` comment left in a tracked source file as one review action naming each comment''s file, line and requirement ids, and never edits source code.'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 7a512ab15da92354c776a16a9ddf18971bf1a1edddbc4b27bca1dfadca243672
semantic_inventory:
  - claim_key: CLAIM-5A4747D198A1BEE0
    claim_text: '`kibi migrate` lists every `implements` comment left in a tracked source file as one review action naming each comment''s file, line and requirement ids, and never edits source code'
    role: descriptive
    status: modeled
    span:
      start: 0
      end: 180
logic_claims:
  - CLAIM-5A4747D198A1BEE0
id: REQ-migrate-inline-implements-review
type: req
---
`kibi migrate` lists every `implements` comment left in a tracked source file as one review action naming each comment's file, line and requirement ids, and never edits source code.

## Why

Once comments stopped counting, a repository that relied on them fails the staged gate on the next commit that touches such a symbol. The maintainer asked for a migration path rather than a silent break: the plan lists the comments so a person can move each link that still holds into the manifest. Kibi does not rewrite user code, so removing the comments stays with the person.

## Source

> We already decided at some point comments should be fallbacks, and the symbols cooridnates should take their role. I still see the comments in the code - should we just hard drop/migrate them?

Maintainer, 2026-11-11.
