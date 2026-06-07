---
id: FACT-COPY-FROM-MAIN
title: Copy From Default Branch Snapshot
status: active
created_at: 2026-02-20T14:40:00Z
updated_at: 2026-04-24T08:12:00Z
source: documentation/facts/FACT-COPY-FROM-MAIN.md
tags: [branching, copy-from-default-branch]
fact_kind: property_value
subject_key: kibi.kb.branch
property_key: initialization_source
operator: eq
value_type: string
value_string: resolved_default_branch
polarity: require
---

New branch stores are initialized by copying the resolved default branch snapshot. The default branch is determined in this order: `.kb/config.json` `defaultBranch` (if set), then `origin/HEAD` (if available), then `main` as fallback.
