---
id: TEST-zcode-kibi-plugin-v1
title: Verify ZCode Kibi plugin manifest, hooks, skills, and opt-in behavior
status: active
created_at: 2026-09-15T00:00:00.000Z
updated_at: 2026-09-15T00:00:00.000Z
priority: must
links:
  - type: validates
    target: SCEN-zcode-kibi-plugin-v1
  - type: validates
    target: REQ-zcode-kibi-plugin-v1
type: test
---
---
id: TEST-zcode-kibi-plugin-v1
title: Verify ZCode Kibi plugin manifest, hooks, skills, and opt-in behavior
status: active
created_at: 2026-09-15T00:00:00Z
updated_at: 2026-09-16T00:00:00Z
priority: must
links:
  - type: validates
    target: SCEN-zcode-kibi-plugin-v1
  - type: validates
    target: REQ-zcode-kibi-plugin-v1
---

Exercise the ZCode adapter contract through the `packages/zcode` bun test suite: the plugin manifest and MCP declaration match the ZCode schema, hooks declare only supported events with advisory outputs, the skills mirror stays in contract with the canonical bundled skills, and the hook runner stays silent outside opted-in workspaces. Regression coverage pins the corrected lifecycle: only file-mutating tools create dirty paths; dirty tracking, check acknowledgement, classification, and reminders share canonical workspace-relative path identities; a later edit invalidates a covering impact check for that exact path only; state is namespaced per host session with isolated unattributed events and hashed session keys; and the MCP launcher launches the resolved kibi-mcp entry shell-free with genuine missing-versus-launch-failure classification, verified end to end by subprocess tests that run the launcher and hook runner under Node. Copied-install and packed-artifact tests verify the marketplace and npm distribution actually contain and run the declared files. Local ZCode development, package builds, and adapter-suite validation run on Linux/WSL; a native Windows consumer end-to-end test is deferred.