---
id: REQ-vscode-kibi-briefing-v3
title: "VS Code Kibi Briefing v3: Schema-2.0 Alignment & Deterministic Ordering"
status: superseded
created_at: 2026-05-06T04:40:00Z
updated_at: 2026-05-06T04:40:00Z
source: documentation/requirements/REQ-vscode-kibi-briefing-v3.md
priority: must
tags:
  - vscode
  - briefing
  - schema-2.0
  - deterministic-ordering
links:
  - type: supersedes
    target: REQ-vscode-kibi-briefing-v2
  - type: specified_by
    target: SCEN-vscode-kibi-briefing-v3
  - type: verified_by
    target: TEST-vscode-kibi-briefing-v3
---

The VS Code Kibi extension must align with the Schema-2.0 briefing envelope and implement deterministic filename-timestamp ordering for latest-brief selection.

1. **Schema-2.0 Alignment**: The extension must support rendering briefings that follow the Schema-2.0 structure.
    - It must correctly interpret `counts` and `changes` fields for display in the brief editor tab.
    - It must handle the `changeNarrative` string array for the primary narrative block.

2. **Deterministic Latest-Brief Selection**: Selection of the "latest" brief must use filename-timestamp ordering rather than filesystem modification time (`mtime`).
    - Brief files are named using a sortable timestamp pattern (e.g., `brief-20260506-043000.json`).
    - The extension must sort available brief files lexicographically by filename to determine the most recent one.
    - This ensures consistent behavior across different environments and filesystems where `mtime` may be unreliable.

3. **Auto-Open Preservation**: The render-first auto-open behavior established in v2 must be preserved and correctly triggered by the new deterministic selection logic.

4. **Graceful Schema Fallback**: During the migration window, the extension should tolerate Schema-1.0 envelopes but apply Schema-2.0 display logic where possible.
