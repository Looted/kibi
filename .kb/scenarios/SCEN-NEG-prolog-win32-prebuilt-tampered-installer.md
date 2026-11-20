---
title: A win32-x64 repack whose downloaded installer does not match the pinned SHA-256 is refused before extraction
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-20T11:44:58.112Z'
id: SCEN-NEG-prolog-win32-prebuilt-tampered-installer
type: scenario
---
Given an installer whose bytes differ from the SHA-256 pinned under prebuilt.win32-x64 in scripts/swipl-version.json, when scripts/swipl-windows-repack.py build-archive --target win32-x64 runs, then it refuses before extracting anything, so a re-published upstream file fails the build instead of shipping different bytes. scripts/tests/swipl-windows-repack.test.ts covers the checksum refusal.