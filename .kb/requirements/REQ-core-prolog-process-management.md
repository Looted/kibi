---
id: REQ-core-prolog-process-management
title: SWI-Prolog process management and JSON-RPC lifecycle
status: open
created_at: 2026-05-13T10:00:00Z
updated_at: 2026-08-07T15:00:00Z
source: REQ-001
priority: must
tags:
  - core
  - prolog
  - lifecycle
links:
  - type: supersedes
    target: REQ-001
  - type: specified_by
    target: SCEN-001
---

The CLI manages the lifecycle of the SWI-Prolog child process, handling startup, shutdown, and error recovery.
Communication with the Prolog engine is conducted via a JSON-RPC bridge, ensuring robust serialization of complex entity graphs.

MCP must refresh the attached branch KB when the same branch snapshot is replaced externally (for example, by `kibi sync --rebuild`) while remaining attached to the branch.

Read-after-write consistency is preserved across one-shot (bun) queries: compound goals such as the status query must not be served from the PrologProcess query cache, so a same-session `kb_status` observes file and KB writes made after a previous call instead of returning a stale freshness result.
