---
title: Proof run results and producers
status: open
priority: must
firmness: firm
semantic_text: A proof result outcome shall be passed, failed, timed_out, skipped, interrupted or errored. A proof run failure phase shall be setup, collection, execution, teardown or infrastructure. A proof success policy shall be all_required_first_attempt or own_results_first_attempt. A proof binding kind shall be native_case or aggregate_run. A proof run attempts status shall be complete or unavailable. A proof producer shall be command, playwright, junit or tap. The proof integrations file shall be .kb/proof/integrations.json. Proof runs shall be stored under .kb/proof/runs. Kibi shall keep at most 50 proof receipts per test. Kibi shall read coverage rows in pages of at most 10 rows.
semantic_clauses:
  - A proof result outcome shall be passed, failed, timed_out, skipped, interrupted or errored.
  - A proof run failure phase shall be setup, collection, execution, teardown or infrastructure.
  - A proof success policy shall be all_required_first_attempt or own_results_first_attempt.
  - A proof binding kind shall be native_case or aggregate_run.
  - A proof run attempts status shall be complete or unavailable.
  - A proof producer shall be command, playwright, junit or tap.
  - The proof integrations file shall be .kb/proof/integrations.json.
  - Proof runs shall be stored under .kb/proof/runs.
  - Kibi shall keep at most 50 proof receipts per test.
  - Kibi shall read coverage rows in pages of at most 10 rows.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T17:47:25.893Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 6a1771afbe7c2cb016a614810472173e6211a53ec7a0423f126ed3ba63ab6c05
semantic_inventory:
  - claim_key: CLAIM-D8E61F01CA133EFE
    claim_text: A proof result outcome shall be passed, failed, timed_out, skipped, interrupted or errored
    role: normative
    status: modeled
    span:
      start: 0
      end: 90
  - claim_key: CLAIM-D6A80A6B786D845A
    claim_text: A proof run failure phase shall be setup, collection, execution, teardown or infrastructure
    role: normative
    status: modeled
    span:
      start: 92
      end: 183
  - claim_key: CLAIM-60D2AD30E0E5B204
    claim_text: A proof success policy shall be all_required_first_attempt or own_results_first_attempt
    role: normative
    status: modeled
    span:
      start: 185
      end: 272
  - claim_key: CLAIM-3A5E7E22374EF666
    claim_text: A proof binding kind shall be native_case or aggregate_run
    role: normative
    status: modeled
    span:
      start: 274
      end: 332
  - claim_key: CLAIM-90AD356D3D051F57
    claim_text: A proof run attempts status shall be complete or unavailable
    role: normative
    status: modeled
    span:
      start: 334
      end: 394
  - claim_key: CLAIM-5FD532ADAFB84B98
    claim_text: A proof producer shall be command, playwright, junit or tap
    role: normative
    status: modeled
    span:
      start: 396
      end: 455
  - claim_key: CLAIM-2BAB7735C9EF0E1A
    claim_text: The proof integrations file shall be .kb/proof/integrations.json
    role: normative
    status: modeled
    span:
      start: 457
      end: 521
  - claim_key: CLAIM-0432EB217242A518
    claim_text: Proof runs shall be stored under .kb/proof/runs
    role: normative
    status: modeled
    span:
      start: 523
      end: 570
  - claim_key: CLAIM-B299410215E2FC50
    claim_text: Kibi shall keep at most 50 proof receipts per test
    role: normative
    status: modeled
    span:
      start: 572
      end: 622
  - claim_key: CLAIM-159D396F3EE48E0B
    claim_text: Kibi shall read coverage rows in pages of at most 10 rows
    role: normative
    status: modeled
    span:
      start: 624
      end: 681
logic_claims:
  - CLAIM-D8E61F01CA133EFE
  - CLAIM-D6A80A6B786D845A
  - CLAIM-60D2AD30E0E5B204
  - CLAIM-3A5E7E22374EF666
  - CLAIM-90AD356D3D051F57
  - CLAIM-5FD532ADAFB84B98
  - CLAIM-2BAB7735C9EF0E1A
  - CLAIM-0432EB217242A518
  - CLAIM-B299410215E2FC50
  - CLAIM-159D396F3EE48E0B
id: REQ-kibi-proof-run-vocabulary
type: req
---
A proof result outcome shall be passed, failed, timed_out, skipped, interrupted or errored. A proof run failure phase shall be setup, collection, execution, teardown or infrastructure. A proof success policy shall be all_required_first_attempt or own_results_first_attempt. A proof binding kind shall be native_case or aggregate_run. A proof run attempts status shall be complete or unavailable. A proof producer shall be command, playwright, junit or tap. The proof integrations file shall be .kb/proof/integrations.json. Proof runs shall be stored under .kb/proof/runs. Kibi shall keep at most 50 proof receipts per test. Kibi shall read coverage rows in pages of at most 10 rows.

## Context

REQ-kibi-fresh-verification-receipts records proof runs as receipts. packages/cli/src/public/proof-protocol.ts closes the lists a run reports with, packages/cli/src/proof/integrations.ts names the producers and where runs and integrations live, and the receipt and coverage report are bounded. They are stated here so every value is proved against its constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"