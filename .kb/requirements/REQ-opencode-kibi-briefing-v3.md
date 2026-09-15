---
id: REQ-opencode-kibi-briefing-v3
title: "OpenCode Kibi Briefing v3: Reliable Session-Grounded Guidance"
status: closed
created_at: 2026-04-24T00:00:00.000Z
updated_at: 2026-04-24T00:00:00.000Z
source: documentation/requirements/REQ-opencode-kibi-briefing-v3.md
priority: must
tags:
  - opencode
  - briefing
  - reliability
  - session-local
  - historical-status:superseded
links:
  - type: supersedes
    target: REQ-opencode-kibi-briefing-v2
  - type: specified_by
    target: SCEN-opencode-kibi-briefing-v3
  - type: verified_by
    target: TEST-opencode-kibi-briefing-v3
semantic_text: >
  The OpenCode Kibi Briefing system must transition to a session-grounded
  reconcile model to ensure briefings remain accurate and reliable across
  complex multi-step agent workflows.


  **Session-Local Authority**: Briefings must be generated based on the
  **current-session** state, including dirty files and session history, ensuring
  guidance matches the agent's actual environment.

  **Reconcile Mechanism**: The plugin must reconcile the local session state
  with the KB snapshot. If the session state has diverged, the briefing must be
  regenerated or adjusted to maintain accuracy.

  **Multi-File Fingerprinting**: Briefing triggers and cache keys must use a
  fingerprint derived from all currently active/edited files in the session to
  prevent stale guidance when bouncing between related files.

  **Baseline Reset**: The briefing system must explicitly revert-to-baseline and
  clear all cached briefings on branch checkout or session termination.

  **Event Flow**:

  `file.edited` continues to serve as a fast-path trigger for the reconcile
  cycle.

  `system.transform` remains the primary injection point for guidance,
  leveraging the reconciled briefing state.

  **Manual Escape Hatch**: The `/brief-kibi` command must be preserved as the
  canonical manual refresh mechanism.

  **MCP Constraint**: All briefing generation must continue to use the
  `kb_briefing_generate` MCP tool. Direct use of `kibi` CLI commands (init,
  sync, check, etc.) by agents is strictly forbidden.

  **Toast Invariant**: Toast notification behavior from v2 must be preserved,
  but grounded in the new reconcile-ready state.

  **Config Split**: Brief policy is split across two locations:

  Shared policy (`.kb/config.json`): `briefs.enabled`, `briefs.channels.vscode`,
  `briefs.channels.tui`, `briefs.tui.toast`, `briefs.tui.appendPrompt`

  OpenCode-local (`.opencode/kibi.json`): `ux.briefs.autoSubmit` (default:
  `true`)

  **Canonical Retrieval**: The `/brief-kibi` command remains the canonical
  manual refresh mechanism, unaffected by `autoSubmit` settings.
proof_exempt: true
proof_exempt_reason: Historical requirement already retired as superseded before
  the test-quality audit; retained for provenance, outside current
  implementation proof scope.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: e0826546a05f668c045db995d101435aab9cc234bd79b7b30fbe5cba841492a4
semantic_inventory:
  - claim_key: CLAIM-2870A724F08E70B5
    claim_text: The OpenCode Kibi Briefing system must transition to a
      session-grounded reconcile model to ensure briefings remain accurate and
      reliable across complex multi-step agent workflows
    role: normative
    status: ontology_gap
    span:
      start: 0
      end: 178
    payload_hash: 60311964d741320c6f742e53e1ab198110c6e827942447a8c8856dcf1a46ec0f
    reason: This normative clause has no deterministic strict-property or declared
      predicate grounding. Define its domain terms and predicate signature
      explicitly before grounding it; keep it unresolved instead of treating
      prose as logic-complete.
  - claim_key: CLAIM-937D640B555E68FA
    claim_text: "**Session-Local Authority**: Briefings must be generated based on
      the **current-session** state, including dirty files and session history,
      ensuring guidance matches the agent's actual environment"
    role: normative
    status: ontology_gap
    span:
      start: 181
      end: 377
    payload_hash: 60311964d741320c6f742e53e1ab198110c6e827942447a8c8856dcf1a46ec0f
    reason: This normative clause has no deterministic strict-property or declared
      predicate grounding. Define its domain terms and predicate signature
      explicitly before grounding it; keep it unresolved instead of treating
      prose as logic-complete.
  - claim_key: CLAIM-7B4304CF8CDFDB49
    claim_text: "**Reconcile Mechanism**: The plugin must reconcile the local
      session state with the KB snapshot"
    role: normative
    status: ontology_gap
    span:
      start: 379
      end: 474
    payload_hash: 60311964d741320c6f742e53e1ab198110c6e827942447a8c8856dcf1a46ec0f
    reason: This normative clause has no deterministic strict-property or declared
      predicate grounding. Define its domain terms and predicate signature
      explicitly before grounding it; keep it unresolved instead of treating
      prose as logic-complete.
  - claim_key: CLAIM-0CD613E6B57700C5
    claim_text: If the session state has diverged, the briefing must be regenerated
      or adjusted to maintain accuracy
    role: condition
    status: missing
    span:
      start: 476
      end: 576
    payload_hash: 60311964d741320c6f742e53e1ab198110c6e827942447a8c8856dcf1a46ec0f
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-888945EED36ECC0B
    claim_text: "**Multi-File Fingerprinting**: Briefing triggers and cache keys
      must use a fingerprint derived from all currently active/edited files in
      the session to prevent stale guidance when bouncing between related files"
    role: normative
    status: ontology_gap
    span:
      start: 578
      end: 788
    payload_hash: 60311964d741320c6f742e53e1ab198110c6e827942447a8c8856dcf1a46ec0f
    reason: This normative clause has no deterministic strict-property or declared
      predicate grounding. Define its domain terms and predicate signature
      explicitly before grounding it; keep it unresolved instead of treating
      prose as logic-complete.
  - claim_key: CLAIM-16BB49BA5581AD0B
    claim_text: "**Baseline Reset**: The briefing system must explicitly
      revert-to-baseline and clear all cached briefings on branch checkout or
      session termination"
    role: normative
    status: ontology_gap
    span:
      start: 790
      end: 937
    payload_hash: 60311964d741320c6f742e53e1ab198110c6e827942447a8c8856dcf1a46ec0f
    reason: This normative clause has no deterministic strict-property or declared
      predicate grounding. Define its domain terms and predicate signature
      explicitly before grounding it; keep it unresolved instead of treating
      prose as logic-complete.
  - claim_key: CLAIM-33CDC98D47EC7AA0
    claim_text: "**Event Flow**"
    role: descriptive
    status: missing
    span:
      start: 939
      end: 953
    payload_hash: 60311964d741320c6f742e53e1ab198110c6e827942447a8c8856dcf1a46ec0f
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-AD72A4BDEE2BC4EC
    claim_text: "`file.edited` continues to serve as a fast-path trigger for the
      reconcile cycle"
    role: descriptive
    status: missing
    span:
      start: 955
      end: 1034
    payload_hash: 60311964d741320c6f742e53e1ab198110c6e827942447a8c8856dcf1a46ec0f
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-3A8591F933C636C6
    claim_text: "`system.transform` remains the primary injection point for
      guidance, leveraging the reconciled briefing state"
    role: descriptive
    status: missing
    span:
      start: 1036
      end: 1145
    payload_hash: 60311964d741320c6f742e53e1ab198110c6e827942447a8c8856dcf1a46ec0f
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-AEB6D6240045B4B7
    claim_text: "**Manual Escape Hatch**: The `/brief-kibi` command must be
      preserved as the canonical manual refresh mechanism"
    role: normative
    status: ontology_gap
    span:
      start: 1147
      end: 1257
    payload_hash: 60311964d741320c6f742e53e1ab198110c6e827942447a8c8856dcf1a46ec0f
    reason: This normative clause has no deterministic strict-property or declared
      predicate grounding. Define its domain terms and predicate signature
      explicitly before grounding it; keep it unresolved instead of treating
      prose as logic-complete.
  - claim_key: CLAIM-DDF2C80051872D4D
    claim_text: "**MCP Constraint**: All briefing generation must continue to use
      the `kb_briefing_generate` MCP tool"
    role: normative
    status: ontology_gap
    span:
      start: 1259
      end: 1359
    payload_hash: 60311964d741320c6f742e53e1ab198110c6e827942447a8c8856dcf1a46ec0f
    reason: This normative clause has no deterministic strict-property or declared
      predicate grounding. Define its domain terms and predicate signature
      explicitly before grounding it; keep it unresolved instead of treating
      prose as logic-complete.
  - claim_key: CLAIM-CF169C8263B5BE99
    claim_text: Direct use of `kibi` CLI commands (init, sync, check, etc.) by
      agents is strictly forbidden
    role: normative
    status: ontology_gap
    span:
      start: 1361
      end: 1452
    payload_hash: 60311964d741320c6f742e53e1ab198110c6e827942447a8c8856dcf1a46ec0f
    reason: This normative clause has no deterministic strict-property or declared
      predicate grounding. Define its domain terms and predicate signature
      explicitly before grounding it; keep it unresolved instead of treating
      prose as logic-complete.
  - claim_key: CLAIM-FFEDD11359530DE0
    claim_text: "**Toast Invariant**: Toast notification behavior from v2 must be
      preserved, but grounded in the new reconcile-ready state"
    role: normative
    status: ontology_gap
    span:
      start: 1454
      end: 1575
    payload_hash: 60311964d741320c6f742e53e1ab198110c6e827942447a8c8856dcf1a46ec0f
    reason: This normative clause has no deterministic strict-property or declared
      predicate grounding. Define its domain terms and predicate signature
      explicitly before grounding it; keep it unresolved instead of treating
      prose as logic-complete.
  - claim_key: CLAIM-91368C039739A958
    claim_text: "**Config Split**: Brief policy is split across two locations"
    role: descriptive
    status: missing
    span:
      start: 1577
      end: 1637
    payload_hash: 60311964d741320c6f742e53e1ab198110c6e827942447a8c8856dcf1a46ec0f
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-42F05C704EB46CAA
    claim_text: "Shared policy (`.kb/config.json`): `briefs.enabled`,
      `briefs.channels.vscode`, `briefs.channels.tui`, `briefs.tui.toast`,
      `briefs.tui.appendPrompt`"
    role: descriptive
    status: missing
    span:
      start: 1639
      end: 1786
    payload_hash: 60311964d741320c6f742e53e1ab198110c6e827942447a8c8856dcf1a46ec0f
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-6B757291E002E717
    claim_text: "OpenCode-local (`.opencode/kibi.json`): `ux.briefs.autoSubmit`
      (default: `true`)"
    role: descriptive
    status: missing
    span:
      start: 1787
      end: 1867
    payload_hash: 60311964d741320c6f742e53e1ab198110c6e827942447a8c8856dcf1a46ec0f
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-C039AC81334809D5
    claim_text: "**Canonical Retrieval**: The `/brief-kibi` command remains the
      canonical manual refresh mechanism, unaffected by `autoSubmit` settings"
    role: descriptive
    status: missing
    span:
      start: 1868
      end: 2002
    payload_hash: 60311964d741320c6f742e53e1ab198110c6e827942447a8c8856dcf1a46ec0f
    reason: No accepted typed interpretation grounds this assertive proposition.
logic_claims:
  - CLAIM-2870A724F08E70B5
  - CLAIM-937D640B555E68FA
  - CLAIM-7B4304CF8CDFDB49
  - CLAIM-0CD613E6B57700C5
  - CLAIM-888945EED36ECC0B
  - CLAIM-16BB49BA5581AD0B
  - CLAIM-33CDC98D47EC7AA0
  - CLAIM-AD72A4BDEE2BC4EC
  - CLAIM-3A8591F933C636C6
  - CLAIM-AEB6D6240045B4B7
  - CLAIM-DDF2C80051872D4D
  - CLAIM-CF169C8263B5BE99
  - CLAIM-FFEDD11359530DE0
  - CLAIM-91368C039739A958
  - CLAIM-42F05C704EB46CAA
  - CLAIM-6B757291E002E717
  - CLAIM-C039AC81334809D5
type: req
---

The OpenCode Kibi Briefing system must transition to a session-grounded reconcile model to ensure briefings remain accurate and reliable across complex multi-step agent workflows.

1.  **Session-Local Authority**: Briefings must be generated based on the **current-session** state, including dirty files and session history, ensuring guidance matches the agent's actual environment.
2.  **Reconcile Mechanism**: The plugin must reconcile the local session state with the KB snapshot. If the session state has diverged, the briefing must be regenerated or adjusted to maintain accuracy.
3.  **Multi-File Fingerprinting**: Briefing triggers and cache keys must use a fingerprint derived from all currently active/edited files in the session to prevent stale guidance when bouncing between related files.
4.  **Baseline Reset**: The briefing system must explicitly revert-to-baseline and clear all cached briefings on branch checkout or session termination.
5.  **Event Flow**:
    - `file.edited` continues to serve as a fast-path trigger for the reconcile cycle.
    - `system.transform` remains the primary injection point for guidance, leveraging the reconciled briefing state.
6.  **Manual Escape Hatch**: The `/brief-kibi` command must be preserved as the canonical manual refresh mechanism.
7.  **MCP Constraint**: All briefing generation must continue to use the `kb_briefing_generate` MCP tool. Direct use of `kibi` CLI commands (init, sync, check, etc.) by agents is strictly forbidden.
8.  **Toast Invariant**: Toast notification behavior from v2 must be preserved, but grounded in the new reconcile-ready state.
9.  **Config Split**: Brief policy is split across two locations:
    - Shared policy (`.kb/config.json`): `briefs.enabled`, `briefs.channels.vscode`, `briefs.channels.tui`, `briefs.tui.toast`, `briefs.tui.appendPrompt`
    - OpenCode-local (`.opencode/kibi.json`): `ux.briefs.autoSubmit` (default: `true`)
10. **Canonical Retrieval**: The `/brief-kibi` command remains the canonical manual refresh mechanism, unaffected by `autoSubmit` settings.
