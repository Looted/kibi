---
title: A dependency that tries to run code is refused or ignored
status: active
tags:
  - negative-path
origin:
  kind: agent
  ref: 'Maintainer request, 2026-11-12, after the review of release 2026.11.2 reported the findings: "Well, can you make a PR with a hotfix then?" and "Yes, do all post review work in the hotfix."; wording approved by the maintainer, 2026-11-12: "Approve"'
  approved_by: maintainer
  recorded_at: '2026-11-12T14:32:09.704Z'
expects: rejection
id: SCEN-NEG-kb-dependency-untrusted-input
type: scenario
---
Given a `.kb/dependencies.json` or lock entry whose `git` or `ref` value starts with a hyphen, such as `--upload-pack=touch /tmp/pwned`, when Kibi reads the file, then it rejects the entry with DEPENDENCIES_INVALID and runs no git command for it. Given a dependency checkout whose `package.json#kibi.plugins` names a plugin committed under its `node_modules`, and whose `.env.kibi` sets a variable, when a Kibi process serves that checkout with KIBI_KB_DEPENDENCY set, then the plugin is not loaded and the variable is not set.

This is the failure side of reading a dependency: its repository is pinned, not trusted. packages/cli/tests/dependencies/kb-dependencies.test.ts, packages/cli/tests/plugins/project-config.test.ts and packages/cli/tests/env/bootstrap.test.ts exercise each case.
