---
title: Signoff refuses a malformed questions file with the field at fault
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:10:42.753Z'
id: SCEN-NEG-kibi-signoff-views-MALFORMED-QUESTIONS
type: scenario
---
Given a questions input that is not JSON, is an empty list, lacks a question, gives a firmness outside firm, default or exploratory, or gives governs as something other than a list of strings, when kibi signoff parses it, then each input is refused with an error naming the problem and the questions entry at fault instead of rendering an unnumbered or partial decision list.

This is the failure side of numbered signoff decisions: a decision view must not be built from input it cannot number and quote. packages/cli/tests/commands/signoff.test.ts "validates the questions input" exercises it.
