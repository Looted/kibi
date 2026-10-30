---
title: The README link check rejects links to GitHub copies and old /docs/ paths of published pages
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:15:06.661Z'
id: SCEN-NEG-docs-readme-published-links-GITHUB-SOURCE-LINK
type: scenario
---
Given README text that links docs/install.md, a published URL under the old /docs/ prefix, or a published page that does not exist, when the README published-docs link check runs over it, then each such link is rejected with one problem, while site-root pages and the report are accepted.

This is the failure side of README published links: a reader sent to a GitHub rendering of the source misses the published site. scripts/tests/readme-published-docs.test.ts "the link check accepts site-root pages and the report, and rejects GitHub copies and old /docs/ paths" exercises it.
