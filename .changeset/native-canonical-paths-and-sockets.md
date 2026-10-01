---
"kibi-cli": patch
"kibi-runtime": patch
---

Kibi can use workspaces reached through native filesystem aliases, including macOS temporary paths, without rejecting valid source writes or confusing engine identity. Long temporary paths use a private shorter engine socket path instead of failing to start. GitHub scaffolding preserves the actual README filename on case-insensitive filesystems. Source writes still reject traversal and symlinks that escape the workspace.

- kibi-cli: canonicalize existing filesystem ancestors before authored-path containment checks and engine identity comparison; reject dangling symlinks.
- kibi-cli and kibi-runtime: choose an owned deterministic runtime directory whose complete Unix socket path fits the platform byte limit.
- kibi-cli: select README candidates by actual directory-entry spelling while preserving priority and broken-symlink checks.
