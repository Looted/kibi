---
title: The default signoff output is never a fenced block and points at the written HTML view
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T19:00:00.000Z'
id: SCEN-NEG-kibi-signoff-written-and-printed-FENCED-DEFAULT
type: scenario
---
Given a workspace with one new requirement, when `kibi signoff` runs with no format flag, then stdout starts the "Requirements signoff" heading as plain Markdown with no code fence anywhere, and stderr names the written latest.html; only an explicit `--format md` wraps the view in a kibi-signoff fence for host renderers.

This is the failure side of printing the view as unfenced Markdown by default. documentation/tests/e2e/packed/cli-workflows.test.ts "should show the requirements signoff summary and decisions view" exercises it through verifyRequirementsSignoff, which also reads the JSON, Markdown and HTML files written under .kb/briefs/signoff.
