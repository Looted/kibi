---
title: Kibi host hooks record opt-in agent activity around Kibi calls
status: open
priority: should
tags:
  - claude
  - telemetry
  - hooks
  - diagnostics
  - agent-core
semantic_text: kibi-claude hooks must append hook usage records to .kb/usage.log only when KIBI_DIAGNOSTIC_MODE is enabled. Every hook usage record must set its interface to hook. Every hook usage record must preserve the host session identifier. Every hook usage record must name the host agent that wrote it. Every edited hook usage record must list the requirements that the edited file's symbols implement. Every hook usage record for a read, edit, search, or Kibi call must record whether the session had used Kibi before that call. Every hook usage record for a read or edit must record whether knowledge context was shown or suppressed. The Cursor, Codex, ZCode, and OpenCode plugins must write the same kb_usage and edited hook usage records through the shared kibi-agent-core writer. Telemetry acceptance must keep hook usage records out of its Kibi operation events and read them only for the lookup_before_first_edit metric. A failure to write a hook usage record must not change hook output.
semantic_clauses:
  - kibi-claude hooks must append hook usage records to .kb/usage.log only when KIBI_DIAGNOSTIC_MODE is enabled.
  - Every hook usage record must set its interface to hook.
  - Every hook usage record must preserve the host session identifier.
  - Every hook usage record must name the host agent that wrote it.
  - Every edited hook usage record must list the requirements that the edited file's symbols implement.
  - Every hook usage record for a read, edit, search, or Kibi call must record whether the session had used Kibi before that call.
  - Every hook usage record for a read or edit must record whether knowledge context was shown or suppressed.
  - The Cursor, Codex, ZCode, and OpenCode plugins must write the same kb_usage and edited hook usage records through the shared kibi-agent-core writer.
  - Telemetry acceptance must keep hook usage records out of its Kibi operation events and read them only for the lookup_before_first_edit metric.
  - A failure to write a hook usage record must not change hook output.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 5424d005ef7646f50699c3b3f543be6f56ffcd0b8d9e06dc856f932154598929
semantic_inventory:
  - claim_key: CLAIM-F1198EC0B9EF599D
    claim_text: kibi-claude hooks must append hook usage records to .kb/usage.log only when KIBI_DIAGNOSTIC_MODE is enabled
    role: normative
    span:
      start: 0
      end: 107
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-0B05A3DF0916DA59
    claim_text: Every hook usage record must set its interface to hook
    role: normative
    span:
      start: 109
      end: 163
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-22225CDB19BB5ABC
    claim_text: Every hook usage record must preserve the host session identifier
    role: normative
    span:
      start: 165
      end: 230
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-54E7F86597592FB8
    claim_text: Every hook usage record must name the host agent that wrote it
    role: normative
    span:
      start: 232
      end: 294
    status: modeled
    reason: Grounded by a conditional_behavior fact reviewed against the current code.
  - claim_key: CLAIM-EE6C75617395047E
    claim_text: Every edited hook usage record must list the requirements that the edited file's symbols implement
    role: normative
    span:
      start: 296
      end: 394
    status: modeled
    reason: Grounded by a conditional_behavior fact reviewed against the current code.
  - claim_key: CLAIM-80E1ED04FE7E1D64
    claim_text: Every hook usage record for a read, edit, search, or Kibi call must record whether the session had used Kibi before that call
    role: normative
    span:
      start: 396
      end: 521
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-59981DB2FF690608
    claim_text: Every hook usage record for a read or edit must record whether knowledge context was shown or suppressed
    role: normative
    span:
      start: 523
      end: 627
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-969364048769B133
    claim_text: The Cursor, Codex, ZCode, and OpenCode plugins must write the same kb_usage and edited hook usage records through the shared kibi-agent-core writer
    role: normative
    span:
      start: 629
      end: 776
    status: modeled
    reason: Grounded by a conditional_behavior fact reviewed against the current code.
  - claim_key: CLAIM-EEDE76A4E1CA9FBD
    claim_text: Telemetry acceptance must keep hook usage records out of its Kibi operation events and read them only for the lookup_before_first_edit metric
    role: normative
    span:
      start: 778
      end: 919
    status: modeled
    reason: Grounded by a conditional_behavior fact reviewed against the current code.
  - claim_key: CLAIM-C533C51637295AA8
    claim_text: A failure to write a hook usage record must not change hook output
    role: normative
    span:
      start: 921
      end: 987
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
logic_claims:
  - CLAIM-F1198EC0B9EF599D
  - CLAIM-0B05A3DF0916DA59
  - CLAIM-22225CDB19BB5ABC
  - CLAIM-54E7F86597592FB8
  - CLAIM-EE6C75617395047E
  - CLAIM-80E1ED04FE7E1D64
  - CLAIM-59981DB2FF690608
  - CLAIM-969364048769B133
  - CLAIM-EEDE76A4E1CA9FBD
  - CLAIM-C533C51637295AA8
origin:
  kind: agent
  recorded_at: '2026-10-04T02:13:09.581Z'
id: REQ-claude-hook-usage-telemetry-v2
type: req
---
kibi-claude hooks must append hook usage records to .kb/usage.log only when KIBI_DIAGNOSTIC_MODE is enabled. Every hook usage record must set its interface to hook. Every hook usage record must preserve the host session identifier. Every hook usage record must name the host agent that wrote it. Every edited hook usage record must list the requirements that the edited file's symbols implement. Every hook usage record for a read, edit, search, or Kibi call must record whether the session had used Kibi before that call. Every hook usage record for a read or edit must record whether knowledge context was shown or suppressed. The Cursor, Codex, ZCode, and OpenCode plugins must write the same kb_usage and edited hook usage records through the shared kibi-agent-core writer. Telemetry acceptance must keep hook usage records out of its Kibi operation events and read them only for the lookup_before_first_edit metric. A failure to write a hook usage record must not change hook output.

## Rationale

MCP and CLI usage rows show which Kibi operations ran, but not what the agent was doing around them. Hook rows fill that gap: joined on the host session id they show whether agents look requirements up before they change requirement-linked code, which the telemetry acceptance report turns into the `lookup_before_first_edit` metric (changeset `lookup-before-first-edit`). The superseded requirement said acceptance excludes hook rows entirely, which stopped being true when that metric started reading them. Rows are written only when the operator opts in with `KIBI_DIAGNOSTIC_MODE`, and every host plugin now writes them through the shared `kibi-agent-core` hook usage log.
