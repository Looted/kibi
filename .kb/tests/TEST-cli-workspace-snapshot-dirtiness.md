---
title: CLI workspace snapshot relevance regression
status: active
tags:
  - cli
  - verification
  - snapshot
  - unit
verification_scope: unit
verification_perspective: internal
id: TEST-cli-workspace-snapshot-dirtiness
type: test
---
Creates a tracked repository containing source and Kibi recovery artifacts, then proves excluded operational changes remain fully diagnosed without dirtying the verification snapshot and relevant source changes do dirty it. Also proves receipt-only edits to a tracked proof document leave verification snapshot dirtiness false with an unchanged snapshot hash, while edits beyond receipt frontmatter do dirty it.