---
title: A person at a terminal learns about a newer kibi-cli, agents learn it from kibi doctor
status: active
priority: should
tags:
  - release
  - cli
  - doctor
  - update-notice
origin:
  kind: agent
  recorded_at: '2026-11-04T13:23:05.529Z'
id: SCEN-kibi-update-notice
type: scenario
---
Given kibi-cli 2.41.0 is installed and the npm registry publishes 2.42.0, when a person runs kibi commands at a terminal, the first command whose daily check is due starts a detached background request to the registry and exits without waiting; a later command prints one stderr line: `Kibi update available: kibi-cli 2.41.0 -> 2.42.0. Update with '<command for this install>'.`, adding the schema move and the `kibi migrate` step when 2.42.0 declares a newer KB schema. The line repeats at most once a day per version. JSON output, CI, test runs, stderr that is not a terminal and the KIBI_UPDATE_CHECK=0 or NO_UPDATE_NOTIFIER opt-outs print nothing and send nothing. `kibi doctor` reports the same answer under "Kibi updates" for every agent host and for the plain CLI.