---
title: kb_check changed:true gives the commit gate's verdict before staging
status: active
expects: success
tags:
  - check
  - staged
origin:
  kind: agent
  recorded_at: '2026-11-16T18:30:00.000Z'
id: SCEN-check-changed-commit-verdict
type: scenario
---
Given a repository with a new exported function that no requirement owns, edited but not staged, when kibi check --staged runs it passes because nothing is staged, and when kibi check --changed runs it exits 1 with the gate's findings, each tagged blocks: commit, while git diff --cached stays empty; kibi check --changed naming only another file passes; and kb_check changed:true for the function's file returns commitAllowed false with every finding tagged commit or none.