---
id: SCEN-002
title: Developer initializes KB on fresh repository with kibi init
status: active
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-03-22T00:00:00Z
priority: must
tags:
  - cli
  - init
links:
  - REQ-003
  - REQ-008
---

Steps:
1. Developer runs `kibi init` in a git repository root
2. kibi creates `.kb/` directory with `config.json` and `schema/`
3. Git hooks `post-checkout` and `post-merge` are installed under `.git/hooks/`
4. `kibi doctor` reports all checks passing
