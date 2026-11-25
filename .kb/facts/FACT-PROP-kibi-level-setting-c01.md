---
title: Kibi reads the level from kibi.level in the root package.json, or from .kb/setup.json without one
status: active
fact_kind: property_value
subject_key: kibi.level
property_key: reads_package_json_then_setup_json
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-9F5F39218ECF3B41
claim_text: Kibi must read the project's Kibi level from kibi.level in the root package.json, or from .kb/setup.json when the project has no root package.json
text_ref: packages/agent-core/src/kibi-level.ts
tags:
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T09:47:52.651Z'
id: FACT-PROP-kibi-level-setting-c01
type: fact
---
Kibi reads the level from kibi.level in the root package.json, or from .kb/setup.json without one.
