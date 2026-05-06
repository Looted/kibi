---
id: REQ-opencode-kibi-briefing-v6
title: "OpenCode Kibi Briefing v6: Schema-2.0 & Session-Delta Migration"
status: open
created_at: 2026-05-06T04:30:00Z
updated_at: 2026-05-06T04:30:00Z
source: documentation/requirements/REQ-opencode-kibi-briefing-v6.md
priority: must
tags:
  - opencode
  - briefing
  - schema-2.0
  - session-delta
links:
  - type: supersedes
    target: REQ-opencode-kibi-briefing-v5
  - type: specified_by
    target: SCEN-opencode-kibi-briefing-v6
  - type: verified_by
    target: TEST-opencode-kibi-briefing-v6
---

The OpenCode Kibi Briefing system must migrate to Schema-2.0 to support session-delta tracking, providing a high-fidelity audit of changes since the session began.

1. **Session-Delta Baseline**: The briefing engine must use a session-start baseline captured at plugin initialization.
    - Historical briefs from the same branch but previous sessions are ignored for change detection.
    - Deltas represent the net change from session-start to the current state.

2. **Schema-2.0 Contract**: Briefing envelopes must use `schemaVersion: "2.0"` and include the following structure:
    - `counts: { entitiesAdded, entitiesModified, entitiesRemoved, relationshipsChanged }`
    - `changes: { entities: { added, modified, removed }, relationships: { changed } }`
    - The legacy `requirementsAdded` and other flat count fields are removed.

3. **High-Fidelity Change Semantics**: The system must track exact entity lifecycle states:
    - `added`: Entities created during the session.
    - `modified`: Existing entities updated during the session.
    - `removed`: Entities deleted during the session.
    - `relationships.changed`: Any addition or removal of typed links.

4. **Cited-First Narrative Narrative**: The `briefing.changeNarrative` field must be an ordered array of strings.
    - Narrative generation must prioritize MCP-cited entities (those explicitly touched by tools).
    - An audit fallback must catch any un-cited side effects detected in the KB delta.

5. **Write Path Enforcement**: The system must write Schema-2.0 envelopes exclusively. Readers must tolerate Schema-1.0 envelopes during the migration window but prioritize 2.0 semantics.
