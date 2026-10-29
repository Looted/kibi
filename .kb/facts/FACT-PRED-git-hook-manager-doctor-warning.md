---
title: Doctor warns when a hook manager's Kibi commands are not visible
status: active
tags:
  - lane:ontology
  - predicate:failure
  - predicate:behavior
fact_kind: predicate
predicate_name: failure_behavior
predicate_args:
  - kibi_doctor
  - managed_hook_kibi_commands_not_visible
  - warning_not_failure
polarity: assert
canonical_key: failure_behavior(kibi_doctor,managed_hook_kibi_commands_not_visible,warning_not_failure)
claim_key: CLAIM-4607FB568E1208EC
claim_text: must report a managed hook whose Kibi commands it cannot see as a warning, not a failure
text_ref: .kb/requirements/REQ-git-hook-manager-integration.md
origin:
  kind: agent
  recorded_at: '2026-10-29T18:37:46.384Z'
id: FACT-PRED-git-hook-manager-doctor-warning
type: fact
---
Doctor warns when a hook manager's Kibi commands are not visible. This predicate grounds the claim of REQ-git-hook-manager-integration quoted in claim_text, so the requirement's semantic inventory counts it as modeled.