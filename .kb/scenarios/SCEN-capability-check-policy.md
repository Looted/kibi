---
title: An activated check policy blocks unowned components and missing pattern markers
status: active
tags:
  - plugins
  - check-policy
  - kb-check
priority: must
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-09: UI design plugin'
  recorded_at: '2026-10-09T12:12:47.176Z'
id: SCEN-capability-check-policy
type: scenario
---
Given a project that activates a plugin package for kibi.check-policy.v1 whose package.json names a policy document with an ownership rule and a marker rule, when kb_check runs, then Kibi reads the document from inside the package without importing the package module, reports under policy-ownership each production symbol in the rule's file set that implements no current requirement grounded in one of the rule's predicates (unless the symbol carries the exempt tag), and reports under policy-markers each implementing file, with its declared sibling templates, that lacks a pattern_marker of its requirement's ui_pattern. Given an activated policy that is missing, escapes the package root or fails validation, when kb_check runs, then it blocks instead of skipping the rules. A project with no activated policy sees neither rule.
