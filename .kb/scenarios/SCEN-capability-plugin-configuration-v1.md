---
title: Capability plugin configuration and diagnostics
status: open
tags:
  - plugins
  - configuration
id: SCEN-capability-plugin-configuration-v1
type: scenario
---
# SCEN-capability-plugin-configuration-v1

package.json kibi.plugins is the canonical v1 activation and mode surface. Plugin secrets, TYPESAFE_API_KEY, KIBI_JEV_MODEL, and KIBI_JEV_TIMEOUT_MS come from the environment. Blank model values are unset and the default model is jev-latest. The timeout is a positive integer of at most 120000 milliseconds, and a malformed timeout fails before any network call. Programmatic Jev options override environment defaults. Provenance exposes the effective model and never credentials. kibi doctor reports package, capability, mode, and declaration status without importing the plugin, and fails when the package is not declared. v1 has no kibi.config.ts and no generic plugin-options bag.
