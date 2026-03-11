---
id: FACT-010
title: Publishing workflow triggers on master branch push
status: active
created_at: 2026-02-25T15:50:00Z
updated_at: 2026-02-25T15:50:00Z
source: documentation/facts/FACT-010.md
tags:
  - deployment
  - github-actions
  - release-management
---

The npm publishing workflow is configured to trigger automatically on pushes to the `master` branch:

Triggers:
- `push` event to `master` branch
- `workflow_dispatch` event (manual trigger with dry-run option)

Manual trigger supports a `dry-run` input that performs all steps except actual package publication, useful for testing the workflow before release.

This ensures that only commits merged to master result in published npm packages, providing a clear release gate.
