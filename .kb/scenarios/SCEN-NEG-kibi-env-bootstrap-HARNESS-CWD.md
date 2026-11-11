---
title: A nested harness directory is never taken as the workspace root
status: active
priority: must
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-04T15:08:13.834Z'
id: SCEN-NEG-kibi-env-bootstrap-HARNESS-CWD
type: scenario
---
Given a workspace with .kb and a harness working directory tools/harness below it with no .kb or .git of its own
When the packed Kibi env bootstrap resolves the workspace from the harness directory
Then the harness directory is refused as the root: the workspace root is the enclosing directory, and its .env.kibi is loaded with source project_env.

This is the failure side of workspace resolution: a harness that starts in a subdirectory must not get a private, empty Kibi environment. documentation/tests/e2e/packed/cli-env-bootstrap.test.ts "a nested harness directory resolves to the enclosing workspace, never to itself" exercises it.
