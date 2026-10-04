---
title: Claude hooks record opt-in agent activity around Kibi calls
status: closed
priority: should
tags:
  - claude
  - telemetry
  - hooks
  - diagnostics
  - historical-status:superseded
semantic_text: |-
  kibi-claude hooks must append hook usage records to .kb/usage.log only when KIBI_DIAGNOSTIC_MODE is enabled.

  Every hook usage record must set its interface to hook.

  Every hook usage record must preserve the host session identifier.

  Every hook usage record for a read, edit, search, or Kibi call must record whether the session had used Kibi before that call.

  Every hook usage record for a read or edit must record whether knowledge context was shown or suppressed.

  Telemetry acceptance evaluation must exclude hook usage records.

  A failure to write a hook usage record must not change hook output.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 91427c7260b4dddabc3660a71eeddcfe58a017975d4b7e333a74cefc95a4b940
semantic_inventory:
  - claim_key: CLAIM-F1198EC0B9EF599D
    claim_text: kibi-claude hooks must append hook usage records to .kb/usage.log only when KIBI_DIAGNOSTIC_MODE is enabled
    role: normative
    status: modeled
    span:
      start: 0
      end: 107
    payload_hash: ccb3cfea81032c35dd0b0990cdd27746f821c76abceb28b51a2523f0f7175e8f
  - claim_key: CLAIM-0B05A3DF0916DA59
    claim_text: Every hook usage record must set its interface to hook
    role: normative
    status: modeled
    span:
      start: 110
      end: 164
    payload_hash: ccb3cfea81032c35dd0b0990cdd27746f821c76abceb28b51a2523f0f7175e8f
  - claim_key: CLAIM-22225CDB19BB5ABC
    claim_text: Every hook usage record must preserve the host session identifier
    role: normative
    status: modeled
    span:
      start: 167
      end: 232
    payload_hash: ccb3cfea81032c35dd0b0990cdd27746f821c76abceb28b51a2523f0f7175e8f
  - claim_key: CLAIM-80E1ED04FE7E1D64
    claim_text: Every hook usage record for a read, edit, search, or Kibi call must record whether the session had used Kibi before that call
    role: normative
    status: modeled
    span:
      start: 235
      end: 360
    payload_hash: ccb3cfea81032c35dd0b0990cdd27746f821c76abceb28b51a2523f0f7175e8f
  - claim_key: CLAIM-59981DB2FF690608
    claim_text: Every hook usage record for a read or edit must record whether knowledge context was shown or suppressed
    role: normative
    status: modeled
    span:
      start: 363
      end: 467
    payload_hash: ccb3cfea81032c35dd0b0990cdd27746f821c76abceb28b51a2523f0f7175e8f
  - claim_key: CLAIM-38D55CC3A92EF11F
    claim_text: Telemetry acceptance evaluation must exclude hook usage records
    role: normative
    status: modeled
    span:
      start: 470
      end: 533
    payload_hash: ccb3cfea81032c35dd0b0990cdd27746f821c76abceb28b51a2523f0f7175e8f
  - claim_key: CLAIM-C533C51637295AA8
    claim_text: A failure to write a hook usage record must not change hook output
    role: normative
    status: modeled
    span:
      start: 536
      end: 602
    payload_hash: ccb3cfea81032c35dd0b0990cdd27746f821c76abceb28b51a2523f0f7175e8f
logic_claims:
  - CLAIM-F1198EC0B9EF599D
  - CLAIM-0B05A3DF0916DA59
  - CLAIM-22225CDB19BB5ABC
  - CLAIM-80E1ED04FE7E1D64
  - CLAIM-59981DB2FF690608
  - CLAIM-38D55CC3A92EF11F
  - CLAIM-C533C51637295AA8
id: REQ-claude-hook-usage-telemetry
type: req
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
kibi-claude hooks must append hook usage records to .kb/usage.log only when KIBI_DIAGNOSTIC_MODE is enabled.

Every hook usage record must set its interface to hook.

Every hook usage record must preserve the host session identifier.

Every hook usage record for a read, edit, search, or Kibi call must record whether the session had used Kibi before that call.

Every hook usage record for a read or edit must record whether knowledge context was shown or suppressed.

Telemetry acceptance evaluation must exclude hook usage records.

A failure to write a hook usage record must not change hook output.
