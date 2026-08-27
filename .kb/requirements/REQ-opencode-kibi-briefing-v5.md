---
id: REQ-opencode-kibi-briefing-v5
title: "OpenCode Kibi Briefing v5: Session-Local Reconcile & Semantic Dedupe"
status: superseded
created_at: 2026-04-30T12:00:00Z
updated_at: 2026-04-30T12:00:00Z
source: documentation/requirements/REQ-opencode-kibi-briefing-v5.md
priority: must
tags:
  - opencode
  - briefing
  - session-local
  - semantic-dedupe
links:
  - type: supersedes
    target: REQ-opencode-kibi-briefing-v4
  - type: specified_by
    target: SCEN-opencode-kibi-briefing-v5
  - type: verified_by
    target: TEST-opencode-kibi-briefing-v5
---

The OpenCode Kibi Briefing system must transition to a session-local reconcile model with semantic duplicate suppression while preserving the render-first TUI delivery established in v4.

1.  **Session-Local Baseline Counts**: The briefing engine must use session-local baseline counts instead of total historical branch totals.
    - The first briefing in a new session must ignore unread briefs from previous sessions on the same branch.
    - Briefing counters and change detections must be anchored to the state at session start.

2.  **Normalized Content Duplicate Suppression**: Briefings must be suppressed if their normalized visible content matches a previously delivered brief in the current session.
    - Suppression must use a hash of the normalized `promptBlock` content rather than just a `briefId`.
    - Normalization must strip transient whitespace and session-specific metadata to ensure semantic equality.

3.  **Render-First TUI Delivery**: The system must preserve the render-first delivery model where briefings are persisted as envelopes and replayed during `system.transform` if unread.

4.  **Session Authoritativeness**: The plugin-local session scope (including uncommitted edits and session history) must be the authoritative source for reconciliation via `kb_briefing_generate`.

5.  **Multi-File Fingerprinting**: Reconciliation must use multi-file fingerprinting of all currently edited/dirty files in the session to ensure briefing stability.

6.  **Read-State Persistence**: Briefs must be marked as read only after successful TUI delivery. Semantic dedupe operates on the history of delivered (read) briefs within the session.

7.  **Deterministic Selection**: Brief selection must continue to use filename timestamps for consistency.
