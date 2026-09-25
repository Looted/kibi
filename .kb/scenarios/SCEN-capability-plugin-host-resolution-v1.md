---
title: Capability plugin host resolution
status: open
tags:
  - plugins
id: SCEN-capability-plugin-host-resolution-v1
type: scenario
---
# SCEN-capability-plugin-host-resolution-v1

A capability plugin exports validated kibi.plugin.v1 from the named export kibiPlugin, and the exported provider version matches the resolved package version. Only the three capability families are accepted. Each capability has at most one replace provider. Shadow leaves canonical results unchanged and augment adds results beside builtin providers. Activation is explicit in package.json kibi.plugins and resolution is project-local, with no global installation. Permission metadata does not sandbox the load. When kibi.plugins is absent, only automatically registered builtin providers run, and those providers keep historical deterministic analysis.
