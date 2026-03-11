---
id: SCEN-007
title: kibi sync imports entities from Markdown frontmatter and YAML manifest
status: active
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-02-18T13:12:25.000Z
priority: must
tags:
  - sync
  - extractors
links:
  - REQ-007
---

Steps:
1. Developer runs `kibi sync`
2. kibi globs `documentation/requirements/**/*.md`, `documentation/scenarios/**/*.md`, etc. per `.kb/config.json`
3. YAML frontmatter is extracted from each `.md` file and validated
4. `symbols.yaml` is parsed for symbol entries
5. All valid entities are upserted into the Prolog KB
6. `kibi query req` returns entities sourced from the files
