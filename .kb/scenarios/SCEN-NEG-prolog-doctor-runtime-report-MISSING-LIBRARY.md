---
title: Doctor fails the SWI-Prolog check when the resolved runtime cannot load required libraries
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T20:54:24.899Z'
id: SCEN-NEG-prolog-doctor-runtime-report-MISSING-LIBRARY
type: scenario
---
Given a resolved SWI-Prolog whose probe reports that the pcre and chr libraries cannot be loaded, when kibi doctor runs, then the SWI-Prolog check fails, the command exits 1, and the message and details name the missing libraries with remediation pointing at a full SWI-Prolog.

This is the failure side of the doctor runtime report: an incomplete Prolog install must not pass as healthy. packages/cli/tests/commands/doctor-swipl-runtime.test.ts "fails and names the libraries the resolved SWI-Prolog cannot load" exercises it.
