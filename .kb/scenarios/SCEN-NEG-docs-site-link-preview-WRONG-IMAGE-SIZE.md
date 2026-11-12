---
title: A documentation site build refuses a link-preview image that is not 1200x630
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-12T18:33:29.187Z'
id: SCEN-NEG-docs-site-link-preview-WRONG-IMAGE-SIZE
type: scenario
---
Given the documentation site sources, when the committed link-preview image assets/og-image.png is not a 1200x630 PNG (for example a 2400x1260 re-render), then the build exits with an error naming the expected and found size and publishes no site, because every page declares og:image:width 1200 and og:image:height 630.

This is the failure side of the link preview: pages must not advertise a preview size the image does not have. packages/cli/tests/docs-site-pages.test.ts "every page publishes a large link preview whose URLs share the published origin" exercises it.