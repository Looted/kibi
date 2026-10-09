---
title: The shipped UI policy selects components and pattern markers
status: active
tags:
  - plugins
  - ui
  - kibi-plugin-ui
priority: must
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-09: UI design plugin'
  recorded_at: '2026-10-09T12:13:46.144Z'
id: SCEN-ui-plugin-design-policy
type: scenario
---
Given the kibi-plugin-ui package, when Kibi reads the check policy its package.json names, then the document validates, the plugin export validates with no permissions and only a checkPolicy capability, and the ownership rules select PascalCase React components in tsx and jsx files and Angular classes ending in Component while skipping props types, hooks, members, stories, tests and non-component files; the marker rule searches each implementing file and its html template for every pattern_marker of the requirement's ui_pattern.
