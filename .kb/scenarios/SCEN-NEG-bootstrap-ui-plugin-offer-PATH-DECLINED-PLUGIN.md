---
title: A declinedPlugins entry that is not a bare package name is rejected
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:05:19.035Z'
id: SCEN-NEG-bootstrap-ui-plugin-offer-PATH-DECLINED-PLUGIN
type: scenario
---
Given a project Kibi configuration whose declinedPlugins list holds a path such as ./local, or is a string instead of a list, when the configuration is validated, then it is rejected with INVALID_PACKAGE_REFERENCE or INVALID_PROJECT_CONFIG.

This is the failure side of remembering a declined plugin offer: only bare package names may be recorded. packages/plugin-sdk/tests/check-policy.test.ts "records declined plugins as bare package names" exercises it.
