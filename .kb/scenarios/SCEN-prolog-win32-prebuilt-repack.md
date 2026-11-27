---
title: The win32-x64 repack verifies the pinned installer hash, audits PE imports, smoke-tests the relocated tree, and packs the archive on a clean windows-2025 runner
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-20T11:16:27.432Z'
id: SCEN-prolog-win32-prebuilt-repack
type: scenario
---
Given a clean GitHub Actions windows-2025 runner with no swipl on PATH, when scripts/swipl-windows-repack.py build-archive --target win32-x64 runs, then it verifies the pinned installer SHA-256, extracts with 7-Zip, applies the pinned trim list (failing on a missing pinned path), audits every .exe/.dll as PE32+ x86-64 with imports resolving only to payload or system DLLs, smoke-tests the relocated tree, and packs a regular-file tar.gz with a .sha256 sidecar.