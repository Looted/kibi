---
title: A staged symbol's requirement links come only from the symbol manifest
status: active
priority: must
tags:
  - traceability
  - staged-check
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer decision, 2026-11-11, to hard-drop inline implements comments; wording approved: "Ok"'
  recorded_at: '2026-11-11T05:47:29.610Z'
id: SCEN-traceability-manifest-only-links
type: scenario
---
Given a staged function with an `implements REQ-1, REQ-2` comment directly above it and no symbol manifest entry, when the staged traceability gate extracts the changed symbols, then the function has no requirement link.

Given a staged function whose symbol manifest entry implements REQ-MANIFEST and whose leading comment names REQ-INLINE, when the gate extracts it, then its only requirement link is REQ-MANIFEST.

This exists because a stale comment used to pass the gate and to replace the manifest links of the symbol it preceded.