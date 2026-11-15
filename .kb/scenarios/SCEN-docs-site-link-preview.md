---
title: A link to a documentation site page is shared and renders as a large preview
status: open
tags:
  - docs
  - site
  - link-preview
origin:
  kind: agent
  recorded_at: '2026-11-12T18:26:48.290Z'
id: SCEN-docs-site-link-preview
type: scenario
---
Given the documentation site is built from the repository
When a link to the landing page or any documentation page is shared on a social network or in chat
Then the page declares its canonical published URL and Open Graph title, description and image
And it declares a summary_large_image Twitter card with the same title, description and image
And the image is the 1200x630 PNG served from the site root
And every preview URL starts with the published site origin