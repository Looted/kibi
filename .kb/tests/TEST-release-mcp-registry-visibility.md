---
title: Published MCP npm metadata is verified after bounded visibility retries
status: passing
verification_scope: integration
verification_perspective: internal
tags:
  - release
  - mcp-registry
  - npm
  - regression
id: TEST-release-mcp-registry-visibility
type: test
---
Runs the actual publish-mcp-registry npm verification step from .github/workflows/publish.yml in temporary workspaces with fake npm and sleep executables. Covers immediate visibility, two E404 responses followed by correct metadata, exhaustion after twelve attempts, and immediate rejection of wrong or missing mcpName. The requests select registry.npmjs.org and bound npm fetch attempts and timeout.

Validation command: bun test ./scripts/tests/release-workflow-contract.test.ts. This integration test does not execute external npm or MCP Registry publication.
