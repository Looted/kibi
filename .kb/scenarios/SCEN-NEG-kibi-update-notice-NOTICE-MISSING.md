---
title: The kibi CLI prints a notice instead of staying silent about a newer kibi-cli
status: active
expects: rejection
tags:
  - negative-path
  - release
  - update-notice
origin:
  kind: agent
  recorded_at: '2026-11-04T13:26:23.021Z'
id: SCEN-NEG-kibi-update-notice-NOTICE-MISSING
type: scenario
---
Given a cached registry answer that names kibi-cli 2.42.0 while 2.41.0 runs, when a person runs a kibi command at a terminal, then the CLI prints one stderr line naming both versions and the update command, instead of saying nothing about the newer release. packages/cli/tests/update-check.test.ts "prints the cached newer version once, then waits a day" exercises it, and "stays quiet when up to date" pins that an up-to-date install gets no line.

This is the failure side of the update notice requirement.