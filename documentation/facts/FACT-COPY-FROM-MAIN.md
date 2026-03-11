---
id: FACT-COPY-FROM-MAIN
title: Copy From Default Branch Snapshot
status: active
created_at: 2026-02-20T14:40:00Z
updated_at: 2026-02-20T14:40:00Z
source: documentation/facts/FACT-COPY-FROM-MAIN.md
tags: [branching, copy-from-default-branch]
---

New branch stores are initialized by copying the resolved default branch snapshot. The default branch is determined in this order: `.kb/config.json` `defaultBranch` (if set), then `origin/HEAD` (if available), then `main` as fallback.
