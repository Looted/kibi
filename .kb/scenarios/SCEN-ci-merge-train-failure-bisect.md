---
title: A failed train finds the failing pull request
status: active
expects: success
tags:
  - ci
origin:
  kind: agent
  recorded_at: '2026-11-17T11:40:10.495Z'
id: SCEN-ci-merge-train-failure-bisect
type: scenario
---
A train of two fails, fails again after its failed jobs are re-run, and is split. The first half passes and lands; the second, proven again alone on the new develop, fails twice and only then is ejected with a comment.