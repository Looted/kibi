---
title: A read of a KB dependency does not load code its checkout declares
status: active
expects: rejection
priority: must
tags:
  - negative-path
origin:
  kind: agent
  ref: 'Maintainer request, 2026-11-12, after the review of release 2026.11.2 reported the findings: "Well, can you make a PR with a hotfix then?" and "Yes, do all post review work in the hotfix."; wording approved by the maintainer, 2026-11-12: "Approve"'
  approved_by: maintainer
  recorded_at: '2026-11-12T14:32:11.497Z'
id: SCEN-NEG-kb-dependency-checkout-code-loaded
type: scenario
---
Given a dependency whose pinned commit carries a plugin under `node_modules`, a `package.json#kibi.plugins` entry naming it and a `.env.kibi` that sets `NODE_OPTIONS` to a preload script, when `kibi search --kb <name>` reads that dependency, then the read succeeds and neither the plugin nor the preload script runs.

This is the failure side of serving a dependency: a build that loaded the checkout's plugin or env file would run the dependency's code on the reading machine. `packages/cli/tests/dependencies/kb-dependency-untrusted-consumer.test.ts` asserts the marker file both would write is never created.
