---
id: REQ-opencode-v2-plugin-api
title: 'OpenCode Kibi Plugin: Load on OpenCode v1 and v2 Plugin APIs'
status: open
created_at: 2026-10-19T19:00:00.000Z
updated_at: 2026-10-19T19:00:00.000Z
source: packages/opencode/
priority: must
owner: opencode-team
tags:
  - opencode
  - kibi
  - plugin-api
  - compatibility
  - umbrella
links:
  - type: specified_by
    target: SCEN-opencode-v2-plugin-load
  - type: verified_by
    target: TEST-opencode-v2-plugin-api
origin:
  kind: human
  ref: github:Looted/kibi#509
  recorded_at: '2026-10-19T19:00:00.000Z'
semantic_text: "kibi-opencode must load on both OpenCode v1 and OpenCode v2 from a single package. The default export must be a plugin definition object with a non-empty id, a server function for OpenCode v1, and a setup function for OpenCode v2. The package root must not export any function. The TUI entry must export a definition with id, tui, and setup. On OpenCode v2, a hook registration failure must not prevent the remaining hooks from registering and must be reported."
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 11b484410b4cf478773b7c2c30c2d0420c24c2f0133a8db8fdd3784afe9a680a
semantic_inventory:
  - claim_key: CLAIM-E1E745FF5CE6976C
    claim_text: kibi-opencode must load on both OpenCode v1 and OpenCode v2 from a single package
    role: normative
    status: ontology_gap
    span:
      start: 0
      end: 81
  - claim_key: CLAIM-33C1F7387361CE6D
    claim_text: The default export must be a plugin definition object with a non-empty id, a server function for OpenCode v1, and a setup function for OpenCode v2
    role: normative
    status: ontology_gap
    span:
      start: 83
      end: 229
  - claim_key: CLAIM-733DF122ABFEFA77
    claim_text: The package root must not export any function
    role: normative
    status: modeled
    span:
      start: 231
      end: 276
  - claim_key: CLAIM-F6D85429B12F8B60
    claim_text: The TUI entry must export a definition with id, tui, and setup
    role: normative
    status: ontology_gap
    span:
      start: 278
      end: 340
  - claim_key: CLAIM-6CD5134734E3E790
    claim_text: On OpenCode v2, a hook registration failure must not prevent the remaining hooks from registering and must be reported
    role: normative
    status: ontology_gap
    span:
      start: 342
      end: 460
logic_claims:
  - CLAIM-E1E745FF5CE6976C
  - CLAIM-33C1F7387361CE6D
  - CLAIM-733DF122ABFEFA77
  - CLAIM-F6D85429B12F8B60
  - CLAIM-6CD5134734E3E790
type: req
proof_exempt: true
proof_exempt_reason: 'Four clauses stay ontology_gap: no predicate schema binds the dual-host package load, the default-export shape, or the TUI export, and failure_behavior cannot state both hook isolation and reporting. OpenCode 1.19.3 and 2.0.32 host proof is outside the contracted runner.'
---

## Context

OpenCode v2 validates plugin modules against a schema that requires `default` to be an object `{ id, setup }` or `{ id, effect }`. `kibi-opencode` 2.5.4 exported the v1 function `async (input) => Hooks`, so OpenCode v2 refused to load it with "Plugin must export a default definition with an id and an effect or setup function." (GitHub issue #509). OpenCode v1 >= 1.4 already accepts `{ id, server }` definitions, so one object can serve both hosts.

## Requirement

The `kibi-opencode` package must load on both the OpenCode v1 and OpenCode v2 plugin hosts (GitHub issue #509).

- The package default export must be a plugin definition object with a string `id`, a v1 `server` entrypoint, and a v2 `setup` entrypoint. OpenCode v2 rejects function-valued default exports.
- The v2 `setup` path must synthesize the legacy plugin input from the v2 `Context` (worktree from the project directory, directory from the location) and register the existing hooks on v2 domains: system guidance through `session.hook("context")`, tool telemetry and file lifecycle events through `tool.hook("execute.after")`, and the bootstrap command through `command.transform`.
- Because OpenCode v2 publishes no `file.*` bus events, file lifecycle events must be derived from completed `edit`, `write`, and `patch` tool calls.
- A failed registration on one v2 domain must not prevent the other hooks from registering, and `setup` must return a cleanup that disposes every registration.
- The published package must ship a root `index.js` that re-exports the built entrypoint so OpenCode local-directory installs load the plugin.
