---
title: A symbol whose sourceFile is absolute or escapes the workspace is refused
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:09:57.957Z'
id: SCEN-NEG-symbol-sourcefile-workspace-confinement-ESCAPING-SOURCEFILE
type: scenario
---
Given a consumer workspace, when a symbol upsert names sourceFile /tmp/outside-secret.ts or ../outside-secret.ts, then the write is refused as invalid with a message that the path must be workspace-relative.

This is the failure side of sourceFile confinement: a symbol must not point Kibi at files outside the workspace, where it could act as an existence or content oracle. packages/cli/tests/consumer/symbol-sourcefile-workspace-confinement.test.ts "preview write refuses absolute and ..-escaping sourceFile paths" exercises it.
