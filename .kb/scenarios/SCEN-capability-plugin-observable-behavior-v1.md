---
title: Observable capability plugin activation and composition
status: open
tags:
  - plugins
id: SCEN-capability-plugin-observable-behavior-v1
type: scenario
---
# SCEN-capability-plugin-observable-behavior-v1

Given a workspace package.json, activation is explicit, unsafe package references are rejected, inactive plugins are not imported, and replace, augment, and shadow compose as documented. Maintenance operations do not import third-party plugins. Jev stays out of the default dependency graph and falls back locally on failure.
