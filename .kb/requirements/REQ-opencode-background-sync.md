---
id: REQ-opencode-background-sync
title: OpenCode Background Sync
status: open
created_at: 2026-05-13T00:00:00.000Z
source: packages/opencode/src/scheduler.ts
priority: must
owner: opencode-team
tags:
  - opencode
  - kibi
  - sync
links:
  - type: specified_by
    target: SCEN-opencode-background-sync
  - type: verified_by
    target: TEST-opencode-kibi-plugin-v1
semantic_text: The OpenCode plugin must run kibi sync debounced and non-blocking after file edits that can change the KB. The OpenCode plugin must not block the OpenCode session while sync runs. The OpenCode plugin's sync debounce interval must be configurable in the plugin settings. The OpenCode plugin must switch to maintenanceDegraded mode when its sync scheduler cannot be created or sync fails.
logic_claims:
  - CLAIM-53B3F9ACBFD02FCD
  - CLAIM-319DA90A9B492077
  - CLAIM-6C25740401DD0B4E
  - CLAIM-76B92897D005A8DC
semantic_clauses:
  - The OpenCode plugin must run kibi sync debounced and non-blocking after file edits that can change the KB.
  - The OpenCode plugin must not block the OpenCode session while sync runs.
  - The OpenCode plugin's sync debounce interval must be configurable in the plugin settings.
  - The OpenCode plugin must switch to maintenanceDegraded mode when its sync scheduler cannot be created or sync fails.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 06faee62873902c7fa3ef1af5da8af3882a6abd84c6034d131fd13a0aa7e029a
semantic_inventory:
  - claim_key: CLAIM-53B3F9ACBFD02FCD
    claim_text: The OpenCode plugin must run kibi sync debounced and non-blocking after file edits that can change the KB
    role: normative
    status: modeled
    span:
      start: 0
      end: 105
  - claim_key: CLAIM-319DA90A9B492077
    claim_text: The OpenCode plugin must not block the OpenCode session while sync runs
    role: normative
    status: modeled
    span:
      start: 107
      end: 178
  - claim_key: CLAIM-6C25740401DD0B4E
    claim_text: The OpenCode plugin's sync debounce interval must be configurable in the plugin settings
    role: normative
    status: modeled
    span:
      start: 180
      end: 268
  - claim_key: CLAIM-76B92897D005A8DC
    claim_text: The OpenCode plugin must switch to maintenanceDegraded mode when its sync scheduler cannot be created or sync fails
    role: normative
    status: modeled
    span:
      start: 270
      end: 385
type: req
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Atomic clause rewrite of the migrated requirement body (kibi migrate v5->v6).'
  approved_by: maintainer
  recorded_at: '2026-11-03T11:35:21.000Z'
firmness: default
required_evidence: tested
rationale: "The KB must stay current while the agent edits, without making the agent wait on sync."
---
- The OpenCode plugin must run kibi sync debounced and non-blocking after file edits that can change the KB.
- The OpenCode plugin must not block the OpenCode session while sync runs.
- The OpenCode plugin's sync debounce interval must be configurable in the plugin settings.
- The OpenCode plugin must switch to maintenanceDegraded mode when its sync scheduler cannot be created or sync fails.

## Rationale
The KB must stay current while the agent edits, without making the agent wait on sync.
