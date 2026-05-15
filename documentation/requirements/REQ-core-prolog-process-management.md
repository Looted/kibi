---
id: REQ-core-prolog-process-management
title: SWI-Prolog process management and JSON-RPC lifecycle
status: open
created_at: 2026-05-13T10:00:00Z
updated_at: 2026-05-13T10:00:00Z
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
