---
title: A visitor opens the published documentation site and its calls to action are counted
status: open
tags:
  - docs
  - site
  - analytics
origin:
  kind: agent
  recorded_at: '2026-10-06T17:52:54.878Z'
id: SCEN-docs-site-analytics
type: scenario
---
Given the documentation site is built from the repository
When a visitor opens any page on the published Pages host
Then the page loads the Umami analytics script scoped to that host
And the landing page reports install copies, install tab selections, call-to-action clicks and GitHub link clicks
And the page works unchanged when the analytics script is blocked