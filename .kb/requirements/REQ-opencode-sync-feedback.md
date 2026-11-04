---
id: REQ-opencode-sync-feedback
title: OpenCode Sync Feedback
status: open
created_at: 2026-05-13T00:00:00.000Z
source: packages/opencode/src/toast.ts
priority: must
owner: opencode-team
tags:
  - opencode
  - kibi
  - ux
  - review:context-missing
links:
  - type: specified_by
    target: SCEN-opencode-sync-feedback
  - type: verified_by
    target: TEST-opencode-kibi-plugin-v1
semantic_text: The OpenCode plugin must report sync progress and completion through structured logs and non-intrusive toasts. The OpenCode plugin must report sync errors without blocking the OpenCode session. The OpenCode plugin must log every sync-related event as a structured log entry.
logic_claims:
  - CLAIM-8E14860125CCF6A2
  - CLAIM-CFEFD5B750E0410B
  - CLAIM-A0A1297FF5D5F271
semantic_clauses:
  - The OpenCode plugin must report sync progress and completion through structured logs and non-intrusive toasts.
  - The OpenCode plugin must report sync errors without blocking the OpenCode session.
  - The OpenCode plugin must log every sync-related event as a structured log entry.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 6f933a624d4724a52a1102fd3a3e51067740292aa3956bde98c901adaf619f67
semantic_inventory:
  - claim_key: CLAIM-8E14860125CCF6A2
    claim_text: The OpenCode plugin must report sync progress and completion through structured logs and non-intrusive toasts
    role: normative
    status: modeled
    span:
      start: 0
      end: 109
  - claim_key: CLAIM-CFEFD5B750E0410B
    claim_text: The OpenCode plugin must report sync errors without blocking the OpenCode session
    role: normative
    status: modeled
    span:
      start: 111
      end: 192
  - claim_key: CLAIM-A0A1297FF5D5F271
    claim_text: The OpenCode plugin must log every sync-related event as a structured log entry
    role: normative
    status: modeled
    span:
      start: 194
      end: 273
type: req
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Atomic clause rewrite of the migrated requirement body (kibi migrate v5->v6).'
  approved_by: maintainer
  recorded_at: '2026-11-03T11:35:21.000Z'
firmness: default
required_evidence: tested
rationale: "People need to see that sync ran and why it failed, without the session being interrupted."
---
- The OpenCode plugin must report sync progress and completion through structured logs and non-intrusive toasts.
- The OpenCode plugin must report sync errors without blocking the OpenCode session.
- The OpenCode plugin must log every sync-related event as a structured log entry.
