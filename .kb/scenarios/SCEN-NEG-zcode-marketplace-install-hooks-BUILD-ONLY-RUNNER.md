---
status: active
tags:
  - negative-path
  - zcode
  - marketplace
title: A hook entry pointing only at build output is caught before a dead-hook install
origin:
  kind: agent
  recorded_at: '2026-11-20T15:32:35.510Z'
id: SCEN-NEG-zcode-marketplace-install-hooks-BUILD-ONLY-RUNNER
type: scenario
expects: rejection
---
**Given** a kibi-zcode lifecycle hook entry points at a hook-runner file that only exists after `bun run build:zcode`, **when** the plugin source is copied the way a marketplace install copies it, without building, **then** the missing hook target is detected by the install contract tests instead of leaving every hook silently dead.