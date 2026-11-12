---
title: kibi migrate suggests retiring a closed requirement that says it was retired
status: active
priority: must
tags:
  - kb
  - migration
  - retired-status
origin:
  kind: agent
  recorded_at: '2026-11-11T17:31:14.858Z'
id: SCEN-kb-requirement-retired-status-migration-suggestion
type: scenario
---
**Scenario: the migration suggests, a person approves**

**GIVEN** a closed requirement whose proof exemption says it was retired, a closed requirement that is superseded, and a closed requirement that says nothing about retirement
**WHEN** an agent runs `kibi migrate --format json` and then `kibi migrate --apply-safe` without approving the suggestion
**THEN** the plan lists one `req_retired_status_suggest` review action, for the first requirement only, quoting its exemption as the `retired_reason`, and the file stays unchanged
**AND** once the action is approved by id, the requirement reads `status: retired` with that `retired_reason`, and no other line of the file changes.

The superseded requirement is left alone because its successor already governs.