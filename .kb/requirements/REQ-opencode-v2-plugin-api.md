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
links: []
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
