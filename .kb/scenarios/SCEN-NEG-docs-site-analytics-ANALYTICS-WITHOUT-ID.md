---
title: A documentation site build without an Umami website ID loads no analytics
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:15:20.355Z'
id: SCEN-NEG-docs-site-analytics-ANALYTICS-WITHOUT-ID
type: scenario
---
Given the documentation site sources, when the site is built without an Umami website ID, then the build does not load analytics: the landing page carries no cloud.umami.is script and no Umami analytics markup; only a build given a website ID loads the script, scoped to looted.github.io.

This is the failure side of opt-in analytics: a build nobody configured for tracking must not track readers. packages/cli/tests/docs-site-pages.test.ts "builds without analytics by default and loads Umami scoped to the published host when given a website ID" exercises it.
