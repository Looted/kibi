---
title: The README quick start simulation refuses a README whose quick start cannot be followed
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:06:10.910Z'
id: SCEN-NEG-prolog-bundled-quickstart-MISSING-QUICKSTART
type: scenario
---
Given the README quick start simulation, when it reads a README with no Quick start heading, a quick start with no bash code block, or a code block that holds no commands, then extraction fails with an error naming what is missing instead of passing with nothing to run.

This is the failure side of the README quick start guarantee: a quick start a user cannot follow must fail the simulation rather than pass vacuously. scripts/tests/simulate-readme-quickstart.test.ts "refuses a README with no quick start or no commands" exercises it.
