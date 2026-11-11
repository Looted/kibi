---
title: Sync imports front matter entities with plain and typed links
status: active
expects: success
tags:
  - positive-path
origin:
  kind: agent
  recorded_at: '2026-11-10T11:00:00.000Z'
id: SCEN-kibi-markdown-frontmatter-import
type: scenario
---
Given an initialized project, when a requirement's front matter lists a plain string link and a test's front matter lists a typed validates relationship object, then sync imports the plain link as relates_to and the typed object with its explicit validates type.

documentation/tests/e2e/packed/issue-93-regression.test.ts exercises both, inside the TEST-015 proof run.
