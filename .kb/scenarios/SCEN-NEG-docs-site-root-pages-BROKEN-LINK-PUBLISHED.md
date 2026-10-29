---
title: The documentation site build fails when a source links a page that does not exist
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:14:54.998Z'
id: SCEN-NEG-docs-site-root-pages-BROKEN-LINK-PUBLISHED
type: scenario
---
Given the repository documentation sources with a link to does-not-exist.md appended to the welcome page, when the documentation site is built, then the build refuses to publish: it exits 1 and reports Broken documentation links naming does-not-exist.md.

This is the failure side of the broken-link policy: a dead internal link must stop the build instead of reaching readers. packages/cli/tests/docs-site-pages.test.ts "renders repository docs beside the health report and fails on a broken internal link" exercises it.
