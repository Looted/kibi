---
title: While a branch is attached through an unmigrated legacy literal-path store, a CLI or MCP operation that needs the KB engine must be refused with the command that migrates that store, unless it is the plan apply that migrates it
status: active
fact_kind: property_value
subject_key: kibi.kb.branch
property_key: legacy_attachment_engine_operations_refused
operator: eq
value_type: bool
value_bool: true
tags:
  - lane:strict
  - fact:property_value
  - branching
  - migration
claim_text: While a branch is attached through an unmigrated legacy literal-path store, a CLI or MCP operation that needs the KB engine must be refused with the command that migrates that store, unless it is the plan apply that migrates it
text_ref: REQ-kibi-legacy-attachment-engine-refusal
origin:
  kind: agent
  recorded_at: '2026-11-16T20:43:55.327Z'
claim_key: CLAIM-1719E4CB8A1092D1
id: FACT-kibi-legacy-attachment-engine-operations-refused
type: fact
---
While a branch is attached through an unmigrated legacy literal-path store, a CLI or MCP operation that needs the KB engine must be refused with the command that migrates that store, unless it is the plan apply that migrates it. Grounds a clause of REQ-kibi-legacy-attachment-engine-refusal.