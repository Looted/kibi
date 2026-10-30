---
title: An MCP read of an undeclared skill resource path is refused and the declared resources are listed
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:23:20.579Z'
id: SCEN-NEG-mcp-skills-resource-discoverability-UNDECLARED-RESOURCE
type: scenario
---
Given an installed kibi-mcp, when an agent calls kb_skills with action read for the kibi-usage skill and a resource path the manifest does not declare, either a missing file or a path that climbs out of the bundle, then the call fails and the error lists the declared resources; a declared resource is still read.

This is the failure side of skill resource discovery: the skill handler must not become a way to read arbitrary files from the installed package. documentation/tests/e2e/packed/mcp-cli-help.test.ts "should refuse an undeclared skill resource path and list the declared ones" exercises it.
