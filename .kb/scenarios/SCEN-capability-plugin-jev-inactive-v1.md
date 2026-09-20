---
title: Jev inactive and failure fallback
status: open
tags:
  - plugins
id: SCEN-capability-plugin-jev-inactive-v1
type: scenario
---
# SCEN-capability-plugin-jev-inactive-v1

Given kibi-plugin-jev is installed but not activated, importing the package and constructing the registry makes no TypeSafe calls. Given activated classification failures, builtin fallback is used without leaking credentials.
