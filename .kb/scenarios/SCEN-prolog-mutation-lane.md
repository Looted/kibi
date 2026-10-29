---
title: Prolog mutation runner picks the Mutalog copy and forwards arguments
status: active
tags:
  - prolog
  - mutation
  - testing
origin:
  kind: agent
  recorded_at: '2026-10-29T16:12:35.516Z'
id: SCEN-prolog-mutation-lane
type: scenario
---
Given MUTALOG_HOME names a Mutalog checkout, when the Prolog mutation runner executes with Mutalog arguments, then that checkout's entry point receives the arguments unchanged and nothing is installed. Given MUTALOG_HOME is unset and the pinned Mutalog version is already in `.cache/prolog-packs`, when the runner executes, then that pack's entry point runs and no install is attempted.