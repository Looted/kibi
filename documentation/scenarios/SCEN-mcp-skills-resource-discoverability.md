---
id: SCEN-mcp-skills-resource-discoverability
title: Bundled skill resources are discoverable and undeclared paths are rejected
status: active
created_at: 2026-08-18T00:00:00Z
updated_at: 2026-08-18T00:00:00Z
source: documentation/scenarios/SCEN-mcp-skills-resource-discoverability.md
tags: [mcp, skills, discoverability]
links:
  - type: verified_by
    target: TEST-mcp-skills-resource-discoverability
---

Given bundled Kibi skills, when an agent lists skills and loads a declared resource, then discovery returns the skill metadata and the resource body. When the same agent requests an undeclared resource path, then the read is rejected and the error lists the declared resources.
