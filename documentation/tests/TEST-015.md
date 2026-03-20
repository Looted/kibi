---
id: TEST-015
title: Packed CLI sync preserves plain Markdown links as relates_to relationships
status: active
created_at: 2026-03-20T16:20:00Z
updated_at: 2026-03-20T16:20:00Z
source: documentation/tests/e2e/packed/issue-93-regression.test.ts
priority: must
tags:
  - cli
  - e2e
  - sync
  - extractors
  - relationships
links:
  - type: validates
    target: REQ-007
---

## Test Cases

1. Pack and install `kibi-cli` in an isolated consumer sandbox.
2. Create a requirement Markdown file that uses a plain string `links` entry.
3. Create the linked scenario Markdown file in the same repo.
4. Run `kibi sync` and assert exit code 0.
5. Run `kibi query req --id <id> --format json`.
6. Assert the synced requirement includes `relates_to: kb:entity/<scenario-id>`.

## Expected Result

- Packed consumers get the same string-link behavior as the source repo.
- Plain string Markdown links survive sync as generic `relates_to` edges.
- Typed links in the same file still preserve their explicit relationship type.
