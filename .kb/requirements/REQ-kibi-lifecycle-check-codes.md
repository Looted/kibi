---
title: KB lifecycle check codes
status: open
priority: must
firmness: firm
semantic_text: The proposed ADR review code shall be review_adr_proposed. The unlinked ADR review code shall be review_adr_unlinked. The unapproved exception review code shall be review_exception_unapproved. The missing rationale review code shall be review_requirement_rationale_missing. The supersession cycle review code shall be review_supersession_cycle. The dangling source path review code shall be review_source_path_dangling. The dangling source path check rule shall be source-path-dangling. The source path rewrite action id shall be source-path-rewrite. The source path rewrite code shall be source_path_rewrite. The migration sync action id shall be migration-sync. The migration sync code shall be migration_sync. The superseded symbol owner review action id shall be review-symbol-owner-superseded. The superseded symbol owner review code shall be review_symbol_owner_superseded.
semantic_clauses:
  - The proposed ADR review code shall be review_adr_proposed.
  - The unlinked ADR review code shall be review_adr_unlinked.
  - The unapproved exception review code shall be review_exception_unapproved.
  - The missing rationale review code shall be review_requirement_rationale_missing.
  - The supersession cycle review code shall be review_supersession_cycle.
  - The dangling source path review code shall be review_source_path_dangling.
  - The dangling source path check rule shall be source-path-dangling.
  - The source path rewrite action id shall be source-path-rewrite.
  - The source path rewrite code shall be source_path_rewrite.
  - The migration sync action id shall be migration-sync.
  - The migration sync code shall be migration_sync.
  - The superseded symbol owner review action id shall be review-symbol-owner-superseded.
  - The superseded symbol owner review code shall be review_symbol_owner_superseded.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T17:25:33.923Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 8ae219a10f1aef860b08013be23a208396b648ac428847ab3a7297de5d31d530
semantic_inventory:
  - claim_key: CLAIM-C3EEAB6C1BBB59F7
    claim_text: The proposed ADR review code shall be review_adr_proposed
    role: normative
    status: modeled
    span:
      start: 0
      end: 57
  - claim_key: CLAIM-38F792CCEE6129F9
    claim_text: The unlinked ADR review code shall be review_adr_unlinked
    role: normative
    status: modeled
    span:
      start: 59
      end: 116
  - claim_key: CLAIM-21E64A855F1EB4A6
    claim_text: The unapproved exception review code shall be review_exception_unapproved
    role: normative
    status: modeled
    span:
      start: 118
      end: 191
  - claim_key: CLAIM-0380F3C1816B850D
    claim_text: The missing rationale review code shall be review_requirement_rationale_missing
    role: normative
    status: modeled
    span:
      start: 193
      end: 272
  - claim_key: CLAIM-B26CCE9856ABAD66
    claim_text: The supersession cycle review code shall be review_supersession_cycle
    role: normative
    status: modeled
    span:
      start: 274
      end: 343
  - claim_key: CLAIM-D5C09CC767D572F9
    claim_text: The dangling source path review code shall be review_source_path_dangling
    role: normative
    status: modeled
    span:
      start: 345
      end: 418
  - claim_key: CLAIM-9573897FBAE210B4
    claim_text: The dangling source path check rule shall be source-path-dangling
    role: normative
    status: modeled
    span:
      start: 420
      end: 485
  - claim_key: CLAIM-9FCD149FC09937EF
    claim_text: The source path rewrite action id shall be source-path-rewrite
    role: normative
    status: modeled
    span:
      start: 487
      end: 549
  - claim_key: CLAIM-831D86A6F95FE733
    claim_text: The source path rewrite code shall be source_path_rewrite
    role: normative
    status: modeled
    span:
      start: 551
      end: 608
  - claim_key: CLAIM-AC4230B73B003ADA
    claim_text: The migration sync action id shall be migration-sync
    role: normative
    status: modeled
    span:
      start: 610
      end: 662
  - claim_key: CLAIM-E19F7AFB24A77FE2
    claim_text: The migration sync code shall be migration_sync
    role: normative
    status: modeled
    span:
      start: 664
      end: 711
  - claim_key: CLAIM-525C794415A21798
    claim_text: The superseded symbol owner review action id shall be review-symbol-owner-superseded
    role: normative
    status: modeled
    span:
      start: 713
      end: 797
  - claim_key: CLAIM-9646A15E0E142800
    claim_text: The superseded symbol owner review code shall be review_symbol_owner_superseded
    role: normative
    status: modeled
    span:
      start: 799
      end: 878
logic_claims:
  - CLAIM-C3EEAB6C1BBB59F7
  - CLAIM-38F792CCEE6129F9
  - CLAIM-21E64A855F1EB4A6
  - CLAIM-0380F3C1816B850D
  - CLAIM-B26CCE9856ABAD66
  - CLAIM-D5C09CC767D572F9
  - CLAIM-9573897FBAE210B4
  - CLAIM-9FCD149FC09937EF
  - CLAIM-831D86A6F95FE733
  - CLAIM-AC4230B73B003ADA
  - CLAIM-E19F7AFB24A77FE2
  - CLAIM-525C794415A21798
  - CLAIM-9646A15E0E142800
id: REQ-kibi-lifecycle-check-codes
type: req
---
The proposed ADR review code shall be review_adr_proposed. The unlinked ADR review code shall be review_adr_unlinked. The unapproved exception review code shall be review_exception_unapproved. The missing rationale review code shall be review_requirement_rationale_missing. The supersession cycle review code shall be review_supersession_cycle. The dangling source path review code shall be review_source_path_dangling. The dangling source path check rule shall be source-path-dangling. The source path rewrite action id shall be source-path-rewrite. The source path rewrite code shall be source_path_rewrite. The migration sync action id shall be migration-sync. The migration sync code shall be migration_sync. The superseded symbol owner review action id shall be review-symbol-owner-superseded. The superseded symbol owner review code shall be review_symbol_owner_superseded.

## Context

REQ-kibi-kb-lifecycle-integrity has kb_check report lifecycle problems with stable codes an agent can act on: review codes for findings a person must judge and action ids and codes for repairs Kibi can apply. They are stated here so every code is proved against its constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"