---
title: A dependency that tries to run code is refused or ignored
status: active
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-12T13:46:28.822Z'
expects: rejection
id: SCEN-NEG-kb-dependency-untrusted-input
type: scenario
---
Given a `.kb/dependencies.json` or lock entry whose `git` or `ref` value starts with a hyphen, such as `--upload-pack=touch /tmp/pwned`, when Kibi reads the file, then it rejects the entry with DEPENDENCIES_INVALID and runs no git command for it. Given a dependency checkout whose `package.json#kibi.plugins` names a plugin committed under its `node_modules`, and whose `.env.kibi` sets a variable, when a Kibi process serves that checkout with KIBI_KB_DEPENDENCY set, then the plugin is not loaded and the variable is not set.

This is the failure side of reading a dependency: its repository is pinned, not trusted. packages/cli/tests/dependencies/kb-dependencies.test.ts, packages/cli/tests/plugins/project-config.test.ts and packages/cli/tests/env/bootstrap.test.ts exercise each case.
