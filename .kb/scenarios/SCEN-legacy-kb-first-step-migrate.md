---
title: On a legacy KB, kibi doctor and kb_status agree that kibi migrate --yes comes first
status: active
expects: success
tags:
  - bootstrap
  - migration
  - status
  - doctor
origin:
  kind: agent
  recorded_at: '2026-10-14T21:06:45.891Z'
id: SCEN-legacy-kb-first-step-migrate
type: scenario
---
Given a workspace with a legacy `.kb/config.json` and no `.kb/manifest.json`, when the agent runs `kibi doctor` and `kb_status`, then doctor says to run `kibi migrate --yes` and not `kibi init`, and `kb_status.bootstrap.nextAction` names `kibi migrate --yes` as required with the same note; no bootstrap guidance tells it to run `kibi init`.

This exists because doctor and kb_status named contradictory first steps on a legacy KB.
