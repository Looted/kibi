---
title: MCP must detect when the attached branch KB snapshot has been replaced externall
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: req.req_mcp_kb_freshness
property_key: clause_01_mcp_must_detect_when_the_attached_branch_kb_snap
operator: eq
value_type: bool
value_bool: true
polarity: require
canonical_key: req.req_mcp_kb_freshness.clause_01_mcp_must_detect_when_the_attached_branch_kb_snap.eq.true
claim_key: CLAIM-190EF7DCB40639A3
claim_text: MCP must detect when the attached branch KB snapshot has been replaced externally (for example, by `kibi sync --rebuild`) while the MCP session continues running, and must refresh attachment state before serving queries or mutations.\n\nThe attached KB stamp is based on branch KB filesystem metadata (`packages/mcp/src/server/kb-freshness.ts`) so same-branch replacements are detected without blocking normal branch-switch semantics.\n\nWhen mismatch is detected, MCP must attempt deterministic refresh, retry once if the stamp changed between pre-attach and post-attach detection, and fail closed with `KbRefreshError` when reconciliation cannot be completed
id: FACT-PROP-REQ-MCP-KB-FRESHNESS-C01
type: fact
---
