---
id: REQ-cli-init
title: Scaffold .kb directory, config, and git hooks
status: open
created_at: 2026-05-13T10:00:00Z
updated_at: 2026-05-13T10:00:00Z
source: REQ-003
priority: must
tags:
  - cli
  - init
links:
  - type: supersedes
    target: REQ-003
---

The `kibi init` command scaffolds the `.kb/` directory structure, creates a default `config.json`,
ensures `.kb/` is ignored by git, and optionally installs git hooks for automatic sync and validation.
It also ensures the `documentation/symbols.yaml` manifest exists.
