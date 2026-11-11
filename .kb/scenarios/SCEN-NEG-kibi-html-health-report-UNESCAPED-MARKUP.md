---
title: kibi report escapes markup in knowledge-base text
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-05T07:20:00.000Z'
id: SCEN-NEG-kibi-html-health-report-UNESCAPED-MARKUP
type: scenario
---
Given a packed CLI workspace with a requirement whose title holds `<script>` and `<b>` tags and an ampersand, when `kibi report` writes the health report, then the page shows the title with every tag and the ampersand escaped, and holds neither tag as markup.

This is the failure side of escaping: knowledge-base text is authored by people and agents, so markup in it must never run in the report. documentation/tests/e2e/packed/cli-workflows.test.ts "should escape knowledge-base markup in the health report" exercises it.
