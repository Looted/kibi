---
title: 'Kibi CLI must support `status` command immediately after `kibi init`, providing '
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: kibi.cli.status
property_key: available_before_first_sync
operator: eq
value_type: bool
value_bool: true
polarity: require
canonical_key: req.req_cli_status_pre_first_sync.available_before_first_sync.eq.true
claim_key: CLAIM-11181E5550A15678
claim_text: Kibi CLI must support `status` command immediately after `kibi init`, providing essential metadata about the repository's KB state even before the first `kibi sync` has been performed
id: FACT-PROP-REQ-CLI-STATUS-PRE-FIRST-SYNC-C01
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
